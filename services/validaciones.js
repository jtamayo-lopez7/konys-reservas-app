// RF-05: validación pura del formulario de reserva.
// RF-09, RF-11, RF-14: validación pura de los formularios del administrador.
// F3: validación pura del acceso de personal, del cambio de clave y de las cuentas de personal.
import { CATEGORIAS, ZONAS } from '../constants/dominio';

export function validarReserva(form, capacidad) {
  const errores = {};
  const nombre = String(form.cliente_nombre ?? '').trim();
  if (nombre.length < 2 || nombre.length > 80) errores.cliente_nombre = 'Escribe un nombre de 2 a 80 caracteres.';
  const personas = Number(form.num_personas);
  if (!Number.isInteger(personas) || personas < 1 || personas > capacidad) {
    errores.num_personas = `Indica entre 1 y ${capacidad} personas.`;
  }
  if (String(form.cliente_contacto ?? '').trim().length > 30) errores.cliente_contacto = 'El teléfono debe tener máximo 30 caracteres.';
  if (form.acepta_tratamiento_datos !== true) errores.acepta_tratamiento_datos = 'Autoriza el tratamiento de datos para continuar.';
  return { valido: Object.keys(errores).length === 0, errores };
}

// RF-09: nombre 1-40, zona del dominio, capacidad 1-20, foto opcional.
export function validarMesa(form) {
  const errores = {};
  const nombre = String(form.nombre ?? '').trim();
  if (nombre.length < 1 || nombre.length > 40) errores.nombre = 'Escribe un nombre de 1 a 40 caracteres.';
  if (!ZONAS[form.zona]) errores.zona = 'Elige una zona válida.';
  const capacidad = Number(form.capacidad);
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 20) errores.capacidad = 'Indica una capacidad entre 1 y 20.';
  return { valido: Object.keys(errores).length === 0, errores };
}

// RF-11: hora en formato HH:MM y fin posterior a inicio.
export function validarHorario(form) {
  const errores = {};
  const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
  const inicio = String(form.hora_inicio ?? '').trim();
  const fin = String(form.hora_fin ?? '').trim();
  if (!hora.test(inicio)) errores.hora_inicio = 'Usa el formato HH:MM, por ejemplo 12:30.';
  if (!hora.test(fin)) errores.hora_fin = 'Usa el formato HH:MM, por ejemplo 14:30.';
  if (!errores.hora_inicio && !errores.hora_fin && fin <= inicio) errores.hora_fin = 'La hora de fin debe ser posterior a la de inicio.';
  const duracion = Number(form.duracion_slot);
  if (!Number.isInteger(duracion) || duracion < 15 || duracion > 240) errores.duracion_slot = 'Indica una duración entre 15 y 240 minutos.';
  return { valido: Object.keys(errores).length === 0, errores };
}

// RF-16: nombre 2-60, dirección 5-120 (el mockup 13b la pide), teléfono opcional hasta 30.
export function validarSede(form) {
  const errores = {};
  const nombre = String(form.nombre ?? '').trim();
  if (nombre.length < 2 || nombre.length > 60) errores.nombre = 'Escribe un nombre de 2 a 60 caracteres.';
  const direccion = String(form.direccion ?? '').trim();
  if (direccion.length < 5 || direccion.length > 120) errores.direccion = 'Escribe una dirección de 5 a 120 caracteres.';
  if (String(form.telefono ?? '').trim().length > 30) errores.telefono = 'El teléfono debe tener máximo 30 caracteres.';
  return { valido: Object.keys(errores).length === 0, errores };
}

// RF-14: nombre 1-80, categoría del dominio, precio entero >= 0.
export function validarPlato(form) {
  const errores = {};
  const nombre = String(form.nombre ?? '').trim();
  if (nombre.length < 1 || nombre.length > 80) errores.nombre = 'Escribe un nombre de 1 a 80 caracteres.';
  if (!CATEGORIAS[form.categoria]) errores.categoria = 'Elige una categoría válida.';
  const precio = Number(form.precio);
  if (!Number.isInteger(precio) || precio < 0) errores.precio = 'Indica un precio entero en pesos, por ejemplo 32000.';
  return { valido: Object.keys(errores).length === 0, errores };
}

// F3 (05a): correo con forma válida y clave no vacía. Supabase decide si son correctos.
export function validarAcceso(form) {
  const errores = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.correo ?? '').trim())) errores.correo = 'Escribe un correo válido.';
  if (!String(form.clave ?? '')) errores.clave = 'Escribe tu clave.';
  return { valido: Object.keys(errores).length === 0, errores };
}

// F3 (05e, D-07): clave personal de al menos 8 caracteres y confirmada.
export function validarClaveNueva(form) {
  const errores = {};
  const nueva = String(form.nueva ?? '');
  if (nueva.length < 8) errores.nueva = 'Mínimo 8 caracteres.';
  else if (nueva.length > 72) errores.nueva = 'Máximo 72 caracteres.';
  if (String(form.confirmar ?? '') !== nueva) errores.confirmar = 'Las claves no coinciden.';
  return { valido: Object.keys(errores).length === 0, errores };
}

// F3C (14b y 13b): datos de una cuenta de personal. La clave temporal solo se pide al crear.
export function validarUsuario(form, { nuevo = true } = {}) {
  const errores = {};
  if (nuevo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.correo ?? '').trim())) errores.correo = 'Escribe un correo válido.';
  const nombre = String(form.nombre ?? '').trim();
  if (nombre.length < 2 || nombre.length > 80) errores.nombre = 'Escribe un nombre de 2 a 80 caracteres.';
  if (nuevo) {
    const clave = String(form.clave_temporal ?? '');
    if (clave.length < 8) errores.clave_temporal = 'Mínimo 8 caracteres.';
    else if (clave.length > 72) errores.clave_temporal = 'Máximo 72 caracteres.';
  }
  if (!form.rol_id) errores.rol_id = 'Elige un rol.';
  return { valido: Object.keys(errores).length === 0, errores };
}

// F3 (15b y 15c): rol personalizado. El código es el del CHECK de roles.codigo y solo se pide
// al crear; el alcance no se puede cambiar después (proteger_roles).
export function validarRol(form, { nuevo = true } = {}) {
  const errores = {};
  if (nuevo) {
    const codigo = String(form.codigo ?? '').trim();
    if (!/^[a-z][a-z0-9_]{2,29}$/.test(codigo)) {
      errores.codigo = 'Usa de 3 a 30 caracteres: minúsculas, números o guion bajo, y empieza con letra.';
    }
  }
  const nombre = String(form.nombre ?? '').trim();
  if (nombre.length < 2 || nombre.length > 60) errores.nombre = 'Escribe un nombre de 2 a 60 caracteres.';
  if (String(form.descripcion ?? '').trim().length > 200) errores.descripcion = 'Máximo 200 caracteres.';
  if (!['global', 'sede'].includes(form.alcance)) errores.alcance = 'Elige un alcance válido.';
  return { valido: Object.keys(errores).length === 0, errores };
}
