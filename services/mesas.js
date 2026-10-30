// RF-01, RF-02: lectura pública de mesas activas.
// RF-09, RF-10, RF-13: CRUD administrativo de mesas (requiere sesión de admin).
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,nombre,zona,capacidad,activa,foto_url';

export function listarActivas() {
  return consultar(() => supabase.from('mesas')
    .select('id,nombre,zona,capacidad,foto_url').eq('activa', true).order('nombre'));
}

export function obtenerActiva(id) {
  return consultar(() => supabase.from('mesas')
    .select('id,nombre,zona,capacidad,foto_url').eq('id', id).eq('activa', true).maybeSingle());
}

// Para editar desde el admin: no filtra por activa (a diferencia de obtenerActiva).
export function obtener(id) {
  return consultar(() => supabase.from('mesas').select(columnas).eq('id', id).maybeSingle());
}

export function listarTodas() {
  return consultar(() => supabase.from('mesas').select(columnas).order('activa', { ascending: false }).order('nombre'));
}

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
export function borrar(id) {
  return consultar(() => supabase.from('mesas').delete().eq('id', id));
}
