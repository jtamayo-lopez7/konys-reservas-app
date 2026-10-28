// RF-03, RF-04: jornadas activas para la reserva.
import { supabase } from './supabase';
import { consultar } from './consultas';

export function listar() {
  return consultar(() => supabase.from('horarios')
    .select('id,dia_semana,jornada,hora_inicio,hora_fin,duracion_slot,activo')
    .eq('activo', true).order('hora_inicio'));
}
