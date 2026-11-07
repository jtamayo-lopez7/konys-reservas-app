// F3 (D-05; mockups 14b, 15, 15b y 15c): catálogo de roles con sus privilegios. Lo lee cualquier
// miembro del personal (RLS de 002_roles); solo `roles.gestionar` lo modifica.
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,codigo,nombre,descripcion,alcance,es_sistema,activo,rol_privilegios(privilegio:privilegios(clave,descripcion,alcance))';

// Aplana rol_privilegios en `privilegios: [{ clave, descripcion, alcance }]`.
function aplanar(rol) {
  const { rol_privilegios: lista = [], ...resto } = rol;
  return { ...resto, privilegios: lista.map((rp) => rp.privilegio).filter(Boolean) };
}

export async function listar() {
  const resultado = await consultar(() => supabase.from('roles').select(columnas).order('nombre'));
  return resultado.error ? resultado : { data: resultado.data.map(aplanar), error: null };
}

export async function obtener(id) {
  const resultado = await consultar(() => supabase.from('roles').select(columnas).eq('id', id).maybeSingle());
  if (resultado.error) return resultado;
  return { data: resultado.data ? aplanar(resultado.data) : null, error: null };
}

// Catálogo de los 15 privilegios (15b/15c). `alcance` distingue los dos globales.
export function listarPrivilegios() {
  return consultar(() => supabase.from('privilegios').select('clave,descripcion,alcance').order('descripcion'));
}

// Deja en `rol_privilegios` exactamente las claves pedidas, con el mínimo de escrituras.
// El trigger validar_rol_privilegio rechaza privilegios globales en roles de sede.
async function reemplazarPrivilegios(rolId, claves = []) {
  const actuales = await consultar(() => supabase.from('rol_privilegios')
    .select('privilegio_id').eq('rol_id', rolId));
  if (actuales.error) return actuales;
  const antes = new Set((actuales.data ?? []).map((fila) => fila.privilegio_id));
  const despues = new Set(claves);
  const quitar = [...antes].filter((clave) => !despues.has(clave));
  const agregar = [...despues].filter((clave) => !antes.has(clave));
  if (quitar.length) {
    const borrado = await consultar(() => supabase.from('rol_privilegios')
      .delete().eq('rol_id', rolId).in('privilegio_id', quitar));
    if (borrado.error) return borrado;
  }
  if (agregar.length) {
    const insertado = await consultar(() => supabase.from('rol_privilegios')
      .insert(agregar.map((privilegio_id) => ({ rol_id: rolId, privilegio_id }))));
    if (insertado.error) return insertado;
  }
  return { data: null, error: null };
}

// Crear rol (15c) y asignarle los privilegios. Si falla la asignación se borra el rol recién
// creado para no dejarlo sin permisos; la FK en cascada limpia rol_privilegios.
export async function crear({ codigo, nombre, descripcion, alcance, privilegios }) {
  const rol = await consultar(() => supabase.from('roles')
    .insert({ codigo, nombre, descripcion: descripcion || null, alcance })
    .select('id').single());
  if (rol.error) return rol;
  const asignacion = await reemplazarPrivilegios(rol.data.id, privilegios);
  if (asignacion.error) {
    await consultar(() => supabase.from('roles').delete().eq('id', rol.data.id));
    return asignacion;
  }
  return obtener(rol.data.id);
}

// Editar nombre, descripción y privilegios (15b). El código y el alcance no cambian y el
// trigger proteger_roles impide tocar el rol admin_general.
export async function actualizar(id, { nombre, descripcion, privilegios }) {
  const asignacion = await reemplazarPrivilegios(id, privilegios);
  if (asignacion.error) return asignacion;
  const rol = await consultar(() => supabase.from('roles')
    .update({ nombre, descripcion: descripcion || null }).eq('id', id).select('id').single());
  if (rol.error) return rol;
  return obtener(id);
}

export function cambiarActivo(id, activo) {
  return consultar(() => supabase.from('roles')
    .update({ activo }).eq('id', id).select(columnas).single());
}

// Un rol con usuarios asignados falla por la FK (perfiles_rol_id_fkey); se traduce en errores.js.
// Se pide la fila borrada para detectar los borrados silenciosos por RLS, como en mesas.
export async function eliminar(id) {
  const resultado = await consultar(() => supabase.from('roles').delete().eq('id', id).select('id'));
  if (!resultado.error && (resultado.data ?? []).length === 0) {
    return { data: null, error: 'No se pudo suprimir el rol. Actualiza la lista e inténtalo de nuevo.' };
  }
  return resultado;
}
