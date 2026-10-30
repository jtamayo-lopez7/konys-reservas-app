// RF-07: carta pública con platos disponibles.
// RF-14: gestión administrativa de la carta (crear, editar, ocultar, eliminar).
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,nombre,categoria,descripcion,precio,disponible,foto_url';

export function listar() {
  return consultar(() => supabase.from('platos')
    .select('id,nombre,categoria,descripcion,precio,foto_url').eq('disponible', true).order('nombre'));
}

export function listarTodos() {
  return consultar(() => supabase.from('platos').select(columnas).order('nombre'));
}

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
