// =====================================================================
// Edge Function `crear-usuario` · Fase F3C (D-04, D-07; mockups 13b y 14b)
//
// Crea una cuenta de personal: usuario de Auth (confirmado, con clave
// temporal) y su fila en `perfiles` con debe_cambiar_clave = true.
//
// Seguridad:
//   * La service_role vive solo aquí (variable de entorno de Supabase);
//     nunca en la app.
//   * Los permisos de quien llama se evalúan con SU propio JWT, con las mismas
//     funciones que usa RLS (puede, es_admin_general):
//       - roles de sede: usuarios.gestionar en esa sede (o admin general);
//       - admin_sede y roles globales: solo el admin general.
//   * Un correo repetido no crea nada (KONYS_CORREO_EXISTE, D-04).
//   * Si falla el perfil (por ejemplo, un segundo admin de sede) se borra el
//     usuario de Auth para no dejar cuentas huérfanas.
//
// Entrada (POST JSON): { correo, nombre, clave_temporal, rol_id, sede_id, activo? }
// Salida: 201 { id } | 4xx/5xx { error: 'KONYS_...' }
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(cuerpo, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return responder({ error: 'KONYS_DATOS_INVALIDOS' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const autorizacion = req.headers.get('Authorization') ?? '';
  const token = autorizacion.replace(/^Bearer\s+/i, '');
  const llamador = createClient(url, Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const servicio = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Una sesión cerrada (por ejemplo, desde otro dispositivo) no crea cuentas aunque su JWT siga
  // vigente: Auth lo confirma con getUser(token).
  const { data: sesion, error: errorSesion } = await llamador.auth.getUser(token);
  if (!sesion?.user) {
    console.error('crear-usuario: sesión', errorSesion?.code ?? 'sin usuario');
    return responder({ error: 'KONYS_SESION_VENCIDA' }, 401);
  }

  let datos;
  try {
    datos = await req.json();
  } catch {
    return responder({ error: 'KONYS_DATOS_INVALIDOS' }, 400);
  }

  const correo = String(datos.correo ?? '').trim().toLowerCase();
  const nombre = String(datos.nombre ?? '').trim();
  const clave = String(datos.clave_temporal ?? '');
  const rolId = String(datos.rol_id ?? '');
  const activo = datos.activo !== false;
  if (!CORREO.test(correo) || nombre.length < 2 || nombre.length > 80
      || clave.length < 8 || clave.length > 72 || !rolId) {
    return responder({ error: 'KONYS_DATOS_INVALIDOS' }, 400);
  }

  const { data: rol } = await servicio.from('roles')
    .select('id,codigo,alcance,activo').eq('id', rolId).maybeSingle();
  if (!rol || !rol.activo) return responder({ error: 'KONYS_ROL_INVALIDO' }, 400);
  const sedeId = rol.alcance === 'sede' ? String(datos.sede_id ?? '') : null;
  if (rol.alcance === 'sede') {
    const { data: sede } = await servicio.from('sedes').select('id').eq('id', sedeId).maybeSingle();
    if (!sede) return responder({ error: 'KONYS_PERFIL_SEDE' }, 400);
  }

  // Permisos de quien llama, con su propio JWT.
  const soloGeneral = rol.alcance === 'global' || rol.codigo === 'admin_sede';
  const permiso = soloGeneral
    ? await llamador.rpc('es_admin_general')
    : await llamador.rpc('puede', { p_clave: 'usuarios.gestionar', p_sede: sedeId });
  if (permiso.error || permiso.data !== true) return responder({ error: 'KONYS_SIN_PRIVILEGIO' }, 403);

  const { data: repetido } = await servicio.from('perfiles').select('id').eq('email', correo).maybeSingle();
  if (repetido) return responder({ error: 'KONYS_CORREO_EXISTE' }, 409);

  const { data: creado, error: errorAuth } = await servicio.auth.admin.createUser({
    email: correo, password: clave, email_confirm: true, user_metadata: { nombre },
  });
  if (errorAuth || !creado?.user) {
    const texto = `${errorAuth?.code ?? ''} ${errorAuth?.message ?? ''}`;
    if (/email_exists|already been registered|already registered/i.test(texto)) {
      return responder({ error: 'KONYS_CORREO_EXISTE' }, 409);
    }
    if (/weak_password|weak/i.test(texto)) return responder({ error: 'KONYS_CLAVE_DEBIL' }, 400);
    console.error('crear-usuario: Auth', errorAuth?.code);
    return responder({ error: 'KONYS_ERROR_CUENTAS' }, 500);
  }

  const { error: errorPerfil } = await servicio.from('perfiles').insert({
    id: creado.user.id, nombre, email: correo, rol_id: rol.id, sede_id: sedeId,
    activo, debe_cambiar_clave: true,
  });
  if (errorPerfil) {
    await servicio.auth.admin.deleteUser(creado.user.id);
    const codigo = errorPerfil.message.match(/KONYS_[A-Z_]+/)?.[0]
      ?? (errorPerfil.code === '23505' ? 'KONYS_CORREO_EXISTE' : 'KONYS_ERROR_CUENTAS');
    return responder({ error: codigo }, codigo === 'KONYS_ERROR_CUENTAS' ? 500 : 409);
  }

  return responder({ id: creado.user.id }, 201);
});
