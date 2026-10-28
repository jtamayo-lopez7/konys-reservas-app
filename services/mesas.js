// RF-01, RF-02: lectura pública de mesas activas.
import { supabase } from './supabase';
import { consultar } from './consultas';

export function listarActivas() {
  return consultar(() => supabase.from('mesas')
    .select('id,nombre,zona,capacidad,foto_url').eq('activa', true).order('nombre'));
}

export function obtenerActiva(id) {
  return consultar(() => supabase.from('mesas')
    .select('id,nombre,zona,capacidad,foto_url').eq('id', id).eq('activa', true).maybeSingle());
}
