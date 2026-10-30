// RF-05: validación pura del formulario de reserva.
// RF-09, RF-11, RF-14: validación pura de los formularios del administrador.
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
