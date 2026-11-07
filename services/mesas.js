// RF-01, RF-02: lectura pública de mesas activas de la sede elegida (RN-10).
// RF-09, RF-10, RF-13: CRUD administrativo de mesas (requiere sesión de admin).
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,sede_id,nombre,zona,capacidad,activa,foto_url';
const columnasPublicas = 'id,sede_id,nombre,zona,capacidad,foto_url';

export function listarActivas(sedeId) {
  return consultar(() => supabase.from('mesas')
    .select(columnasPublicas).eq('sede_id', sedeId).eq('activa', true).order('nombre'));
}

// Trae sede_id para que la reserva use los horarios de la sede de la mesa.
export function obtenerActiva(id) {
  return consultar(() => supabase.from('mesas')
    .select(columnasPublicas).eq('id', id).eq('activa', true).maybeSingle());
}

// Para editar desde el admin: no filtra por activa (a diferencia de obtenerActiva).
export function obtener(id) {
  return consultar(() => supabase.from('mesas').select(columnas).eq('id', id).maybeSingle());
}

export function listarTodas(sedeId) {
  return consultar(() => supabase.from('mesas').select(columnas).eq('sede_id', sedeId)
    .order('activa', { ascending: false }).order('nombre'));
}

// La mesa nueva pertenece a la sede indicada (mesa.sede_id).
export function crear(mesa) {
  // Se devuelve la fila porque el admin sí puede leer mesas (a diferencia del cliente).
  return consultar(() => supabase.from('mesas')
    .insert({ ...mesa, capacidad: Number(mesa.capacidad) }).select(columnas).single());
}

export function actualizar(id, cambios) {
  // Solo convierte la capacidad si viene en el cambio (evita NaN), igual que en platos.
  const datos = cambios.capacidad !== undefined ? { ...cambios, capacidad: Number(cambios.capacidad) } : { ...cambios };
  return consultar(() => supabase.from('mesas')
    .update(datos).eq('id', id).select(columnas).single());
}

export function cambiarEstado(id, activa) {
  return consultar(() => supabase.from('mesas').update({ activa }).eq('id', id).select(columnas).single());
}

// Una mesa con reservas no se borra (RN-07): el error 23503 lo explica en errores.js.
// Se pide la fila borrada con select: si RLS u otra causa impide el borrado,
// Supabase afecta 0 filas y no devuelve error; sin esto parecería exitoso.
export async function borrar(id) {
  const resultado = await consultar(() => supabase.from('mesas').delete().eq('id', id).select('id'));
  if (!resultado.error && (resultado.data ?? []).length === 0) {
    return { data: null, error: 'No se pudo borrar la mesa. Actualiza la lista e inténtalo de nuevo.' };
  }
  return resultado;
}
