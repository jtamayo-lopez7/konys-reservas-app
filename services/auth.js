// RF-08 ampliado en F3: acceso del personal con correo y clave (05a) y cambio obligatorio de
// la clave temporal (05e, D-07). El perfil, el rol, la sede y los privilegios los entrega la
// base con mi_sesion(); la autorización real la hace RLS (002_roles), no esta capa.
import { supabase } from './supabase';
import { consultar } from './consultas';
import { evaluarIngreso } from './permisos';

function miSesion() {
  return consultar(() => supabase.rpc('mi_sesion'));
}

// Al abrir la app: la sesión persiste en AsyncStorage (services/supabase.js). Sin sesión,
// data es null. Se relee el perfil siempre de la base para no usar un rol viejo.
export async function cargarSesion() {
  const guardada = await consultar(() => supabase.auth.getSession());
  if (guardada.error) return guardada;
  if (!guardada.data?.session) return { data: null, error: null };
  return miSesion();
}

// Si la cuenta no puede entrar (sin perfil, suspendida, rol oculto, sin permisos), se cierra la
// sesión de inmediato y se devuelve el motivo.
export async function ingresar(correo, clave) {
  const acceso = await consultar(() => supabase.auth.signInWithPassword({
    email: String(correo).trim().toLowerCase(), password: clave,
  }));
  if (acceso.error) return acceso;
  const perfil = await miSesion();
  const motivo = perfil.error ?? evaluarIngreso(perfil.data).error;
  if (motivo) {
    await cerrarSesion();
    return { data: null, error: motivo };
  }
  return perfil;
}

// D-07: cambia la clave en Auth y luego apaga la marca del perfil; devuelve el perfil al día.
export async function cambiarClave(nueva) {
  const cambio = await consultar(() => supabase.auth.updateUser({ password: nueva }));
  if (cambio.error) return cambio;
  const marca = await consultar(() => supabase.rpc('marcar_clave_cambiada'));
  if (marca.error) return marca;
  return miSesion();
}

// Solo en este dispositivo. Con el alcance por defecto (global), salir en un celular revocaba
// las sesiones de la misma cuenta en los demás; esos celulares seguían leyendo datos con su
// token, pero las Edge Functions los rechazaban por "Session not found" (2026-11-06).
export function cerrarSesion() {
  return consultar(() => supabase.auth.signOut({ scope: 'local' }));
}
