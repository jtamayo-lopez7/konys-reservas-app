// F3C (D-04, D-07; mockups 14, 14b, 14c y 13b): personal de una sede.
// - Lista, edición de nombre o rol y suspensión: directo a `perfiles` (RLS de 002_roles).
// - Alta y baja de cuentas: Edge Functions `crear-usuario` y `eliminar-usuario`, porque
//   necesitan la service_role, que nunca está en la app.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { consultar } from './consultas';
import { traducir } from './errores';

const columnas = 'id,nombre,email,activo,debe_cambiar_clave,sede_id,rol:roles(id,codigo,nombre,alcance)';

export function listar(sedeId) {
  return consultar(() => supabase.from('perfiles').select(columnas).eq('sede_id', sedeId).order('email'));
}

export function obtener(id) {
  return consultar(() => supabase.from('perfiles').select(columnas).eq('id', id).maybeSingle());
}

// Solo nombre, rol y acceso; el correo y la sede no cambian desde la app.
export function actualizar(id, { nombre, rol_id, activo }) {
  return consultar(() => supabase.from('perfiles').update({ nombre, rol_id, activo })
    .eq('id', id).select(columnas).single());
}

export function cambiarActivo(id, activo) {
  return consultar(() => supabase.from('perfiles').update({ activo }).eq('id', id).select(columnas).single());
}

// Las funciones responden { error: 'KONYS_...' }; se traduce igual que los errores de la base.
async function invocar(funcion, cuerpo) {
  try {
    const { data, error } = await supabase.functions.invoke(funcion, { body: cuerpo });
    if (!error) return { data, error: null };
    if (error instanceof FunctionsHttpError) {
      const respuesta = await error.context.json().catch(() => ({}));
      if (respuesta?.error) return { data: null, error: traducir({ message: respuesta.error }) };
      if (error.context.status === 404) return { data: null, error: traducir({ message: 'KONYS_FUNCION_NO_DISPONIBLE' }) };
    }
    return { data: null, error: traducir(error) };
  } catch (error) {
    return { data: null, error: traducir(error) };
  }
}

// datos: { correo, nombre, clave_temporal, rol_id, sede_id, activo }
export function crear(datos) {
  return invocar('crear-usuario', {
    ...datos, correo: String(datos.correo).trim().toLowerCase(), nombre: String(datos.nombre).trim(),
  });
}

export function eliminar(usuarioId) {
  return invocar('eliminar-usuario', { usuario_id: usuarioId });
}
