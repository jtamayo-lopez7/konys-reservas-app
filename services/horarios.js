// RF-03, RF-04: jornadas activas para la reserva.
// RF-11: gestión administrativa de horarios (7 días x 2 jornadas).
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,dia_semana,jornada,hora_inicio,hora_fin,duracion_slot,activo';

export function listar() {
  return consultar(() => supabase.from('horarios')
    .select(columnas).eq('activo', true).order('hora_inicio'));
}

export function listarTodos() {
  // La BD tiene un registro por (día, jornada); se listan los 14 aunque estén inactivos.
  return consultar(() => supabase.from('horarios').select(columnas).order('hora_inicio'));
}

export function actualizar(id, cambios) {
  return consultar(() => supabase.from('horarios')
    .update(cambios).eq('id', id).select(columnas).single());
}
