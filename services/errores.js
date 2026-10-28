// RF-01, RF-05, RF-07: mensajes seguros de los errores de datos.
export function traducir(error) {
  const mensaje = error?.message ?? String(error ?? '');
  const capacidad = mensaje.match(/KONYS_CAPACIDAD_EXCEDIDA:(\d+)/);
  if (capacidad) return `Esta mesa admite máximo ${capacidad[1]} personas.`;
  const mensajes = {
    '23P01': 'Ese horario acaba de ser reservado. Elige otro.',
    KONYS_MESA_NO_DISPONIBLE: 'La mesa ya no está disponible.',
    KONYS_FECHA_PASADA: 'Ese horario ya pasó.',
    KONYS_FUERA_DE_HORARIO: 'Ese horario no está habilitado.',
    '23505': 'Ya existe una mesa con ese nombre.',
    '23503': 'La mesa tiene reservas; inactívala en su lugar.',
    '42501': 'Permiso denegado. Revisa la sesión o contacta al administrador.',
  };
  if (mensajes[error?.code]) return mensajes[error.code];
  for (const codigo of Object.keys(mensajes)) {
    if (mensaje.includes(codigo)) return mensajes[codigo];
  }
  if (/network|fetch|conexi[oó]n|offline|internet|timeout|timed out/i.test(mensaje)) {
    return 'Sin conexión a internet. Revisa tu red y vuelve a intentar.';
  }
  return 'No pudimos completar la solicitud. Vuelve a intentar.';
}

