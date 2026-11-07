// RF-07: carta pública con platos disponibles de la sede elegida (RN-10).
// RF-14: gestión administrativa de la carta (crear, editar, ocultar, eliminar).
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,sede_id,nombre,categoria,descripcion,precio,disponible,foto_url';

export function listar(sedeId) {
  return consultar(() => supabase.from('platos')
    .select('id,nombre,categoria,descripcion,precio,foto_url').eq('sede_id', sedeId).eq('disponible', true).order('nombre'));
}

export function listarTodos(sedeId) {
  return consultar(() => supabase.from('platos').select(columnas).eq('sede_id', sedeId).order('nombre'));
}

// El plato nuevo pertenece a la sede indicada (plato.sede_id).
export function crear(plato) {
  return consultar(() => supabase.from('platos')
    .insert({ ...plato, precio: Number(plato.precio) }).select(columnas).single());
}

export function actualizar(id, cambios) {
  // Solo convierte el precio si viene en el cambio: alternar «disponible» no lo
  // trae y Number(undefined) sería NaN, que Supabase rechaza.
  const datos = cambios.precio !== undefined ? { ...cambios, precio: Number(cambios.precio) } : { ...cambios };
  return consultar(() => supabase.from('platos')
    .update(datos).eq('id', id).select(columnas).single());
}

export function borrar(id) {
  return consultar(() => supabase.from('platos').delete().eq('id', id));
}
