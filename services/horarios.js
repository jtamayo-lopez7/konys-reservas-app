// RF-03, RF-04: jornadas activas de la sede para la reserva (RN-10).
// RF-11: gestión administrativa de horarios (7 días x 2 jornadas por sede).
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,sede_id,dia_semana,jornada,hora_inicio,hora_fin,duracion_slot,activo';

export function listar(sedeId) {
  return consultar(() => supabase.from('horarios')
    .select(columnas).eq('sede_id', sedeId).eq('activo', true).order('hora_inicio'));
}

export function listarTodos(sedeId) {
  // La BD tiene un registro por (sede, día, jornada); se listan los 14 aunque estén inactivos.
  return consultar(() => supabase.from('horarios').select(columnas).eq('sede_id', sedeId).order('hora_inicio'));
}

export function actualizar(id, cambios) {
  return consultar(() => supabase.from('horarios')
    .update(cambios).eq('id', id).select(columnas).single());
}
