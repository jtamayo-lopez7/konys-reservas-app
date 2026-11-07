// =====================================================================
// Edge Function `eliminar-usuario` · Fase F3C (D-04; mockups 14 y 14c)
//
// Borra la cuenta de Auth de un miembro del personal. Su perfil cae por
// `on delete cascade`. Las reservas no dependen del perfil y se conservan.
// Para solo suspender el acceso, la app cambia perfiles.activo (RLS).
//
// Seguridad (permisos de quien llama, con SU propio JWT):
//   * personal de sede: usuarios.gestionar en esa sede (o admin general);
//   * admin_sede y roles globales: solo el admin general;
//   * nadie se elimina a sí mismo, y siempre queda un admin general activo.
//
// Entrada (POST JSON): { usuario_id }
// Salida: 200 { id } | 4xx/5xx { error: 'KONYS_...' }
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

  let usuarioId = '';
  try {
    usuarioId = String((await req.json()).usuario_id ?? '');
  } catch {
    return responder({ error: 'KONYS_DATOS_INVALIDOS' }, 400);
  }
  if (!usuarioId) return responder({ error: 'KONYS_DATOS_INVALIDOS' }, 400);

  // El token se pasa explícito: este cliente no guarda sesión (persistSession: false).
  // Auth confirma que la sesión siga viva: si se cerró (por ejemplo, desde otro dispositivo),
  // responde "Session not found" aunque el JWT no haya vencido.
  const { data: sesion, error: errorSesion } = await llamador.auth.getUser(token);
  if (!sesion?.user) {
    console.error('eliminar-usuario: sesión', errorSesion?.code ?? 'sin usuario');
    return responder({ error: 'KONYS_SESION_VENCIDA' }, 401);
  }
  if (sesion.user.id === usuarioId) return responder({ error: 'KONYS_SIN_PRIVILEGIO' }, 403);

  const { data: objetivo } = await servicio.from('perfiles')
    .select('id,sede_id,activo,rol:roles(codigo,alcance)').eq('id', usuarioId).maybeSingle();
  if (!objetivo) return responder({ error: 'KONYS_USUARIO_NO_EXISTE' }, 404);
  const rol = objetivo.rol;

  const soloGeneral = rol.alcance === 'global' || rol.codigo === 'admin_sede';
  const permiso = soloGeneral
    ? await llamador.rpc('es_admin_general')
    : await llamador.rpc('puede', { p_clave: 'usuarios.gestionar', p_sede: objetivo.sede_id });
  if (permiso.error || permiso.data !== true) return responder({ error: 'KONYS_SIN_PRIVILEGIO' }, 403);

  // Siempre debe quedar al menos un admin general activo.
  if (rol.codigo === 'admin_general') {
    const { count } = await servicio.from('perfiles')
      .select('id, roles!inner(codigo)', { count: 'exact', head: true })
      .eq('roles.codigo', 'admin_general').eq('activo', true).neq('id', usuarioId);
    if (!count) return responder({ error: 'KONYS_ROL_PROTEGIDO' }, 409);
  }

  const { error } = await servicio.auth.admin.deleteUser(usuarioId);
  if (error) {
    console.error('eliminar-usuario: Auth', error.code);
    return responder({ error: 'KONYS_ERROR_CUENTAS' }, 500);
  }
  return responder({ id: usuarioId });
});
