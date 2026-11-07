// RF-15: sedes disponibles para la bienvenida (fase F1).
// RF-16: gestión de sedes por el administrador (fase F2, mockups 13, 13b y 13c).
// La sede principal no se desactiva ni se elimina (D-03); el servidor lo impide con un trigger.
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,nombre,direccion,telefono,activa,es_principal';

// La principal va primero; luego por nombre.
export function listarActivas() {
  return consultar(() => supabase.from('sedes').select(columnas).eq('activa', true)
    .order('es_principal', { ascending: false }).order('nombre'));
}

export function listarTodas() {
  return consultar(() => supabase.from('sedes').select(columnas)
    .order('es_principal', { ascending: false }).order('activa', { ascending: false }).order('nombre'));
}

export function obtener(id) {
  return consultar(() => supabase.from('sedes').select(columnas).eq('id', id).maybeSingle());
}

// El servidor crea las 14 jornadas de la sede nueva (trigger sedes_crear_horarios).
export function crear(sede) {
  return consultar(() => supabase.from('sedes').insert(sede).select(columnas).single());
}

export function actualizar(id, cambios) {
  return consultar(() => supabase.from('sedes').update(cambios).eq('id', id).select(columnas).single());
}

export function cambiarEstado(id, activa) {
  return actualizar(id, { activa });
}

// Decisión 2.4: con una sola sede activa no se obliga a elegir. Solo aplica al primer arranque;
// al volver a la bienvenida se muestra la lista para que la rueda de ajustes siga accesible.
export function entradaDirecta(sedes, primerArranque) {
  return Boolean(primerArranque) && Array.isArray(sedes) && sedes.length === 1;
}
