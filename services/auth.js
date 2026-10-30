// RF-08: acceso del administrador con Supabase Auth (H-03, no un PIN en código).
import { supabase } from './supabase';
import { consultar } from './consultas';
import { traducir } from './errores';

// El rol se decide en el servidor: es_admin() lee app_metadata.rol del JWT y
// sin él RLS devuelve listas vacías y rechaza las escrituras con 42501. Aquí
// solo evitamos abrir un panel inútil; la seguridad sigue siendo de RLS.
function esAdmin(usuario) {
  return usuario?.app_metadata?.rol === 'admin';
}

function avisoSinRol(email) {
  return `${email} inició sesión, pero ese usuario no tiene el rol «admin» en Supabase, así que RLS le bloquea los datos. Ejecuta el UPDATE de «Preparación de la prueba (etapa 4)» en docs/pruebas.md (SQL Editor) y vuelve a ingresar.`;
}

export function ingresar(clave) {
  const email = process.env.EXPO_PUBLIC_ADMIN_EMAIL;
  if (!email) return Promise.resolve({ data: null, error: 'Falta configurar EXPO_PUBLIC_ADMIN_EMAIL en .env.' });
  return supabase.auth.signInWithPassword({ email, password: clave })
    .then(({ data, error }) => {
      if (error) return { data: null, error: traducir(error) };
      if (!esAdmin(data?.user)) return { data: null, error: avisoSinRol(email) };
      return { data: true, error: null };
    });
}

export function cerrarSesion() {
  return consultar(() => supabase.auth.signOut());
}

// La sesión persiste en AsyncStorage (services/supabase.js); getSession la lee.
// Se exige el rol también aquí: el JWT guardado puede ser anterior al UPDATE del
// rol, y en ese caso RLS sigue bloqueando; conviene avisar y pedir volver a entrar.
export function sesion() {
  return consultar(() => supabase.auth.getSession()).then((r) => {
    if (r.error || !r.data?.session) return { ...r, data: null };
    if (!esAdmin(r.data.session.user)) return { data: null, error: avisoSinRol(r.data.session.user?.email) };
    return { ...r, data: r.data.session };
  });
}
