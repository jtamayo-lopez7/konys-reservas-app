// RF-07: carta pública con platos disponibles.
import { supabase } from './supabase';
import { consultar } from './consultas';

export function listar() {
  return consultar(() => supabase.from('platos')
    .select('id,nombre,categoria,descripcion,precio,foto_url').eq('disponible', true).order('nombre'));
}
