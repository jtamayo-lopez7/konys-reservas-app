// F3 (D-05; mockups 14b y 15): catálogo de roles con sus privilegios. Lo lee cualquier miembro
// del personal (RLS de 002_roles); solo `roles.gestionar` lo modifica.
import { supabase } from './supabase';
import { consultar } from './consultas';

const columnas = 'id,codigo,nombre,descripcion,alcance,es_sistema,activo,rol_privilegios(privilegio:privilegios(clave,descripcion))';

// Aplana rol_privilegios en `privilegios: [{ clave, descripcion }]`.
function aplanar(rol) {
  const { rol_privilegios: lista = [], ...resto } = rol;
  return { ...resto, privilegios: lista.map((rp) => rp.privilegio).filter(Boolean) };
}

export async function listar() {
  const resultado = await consultar(() => supabase.from('roles').select(columnas).order('nombre'));
  return resultado.error ? resultado : { data: resultado.data.map(aplanar), error: null };
}
