// RF-05: validación pura del formulario de reserva.
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
