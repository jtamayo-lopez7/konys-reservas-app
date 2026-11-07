// RF-01, RF-05, RF-07: mensajes seguros de los errores de datos.
// RF-08 y F3: distingue los fallos de inicio de sesión y de cambio de clave del personal.
export function traducir(error) {
  const mensaje = error?.message ?? String(error ?? '');
  // Supabase Auth (RF-08): se revisan antes que la red porque la frase de
  // límite de intentos contiene "or s" y el detector de red la capturarían.
  if (/invalid login credentials/i.test(mensaje)) return 'Correo o clave incorrectos.';
  if (/email not confirmed/i.test(mensaje)) return 'Tu correo aún no está confirmado. Habla con el administrador.';
  // F3 (05e): respuestas de Auth al cambiar la clave temporal.
  if (/should be different from the old password/i.test(mensaje)) return 'La clave nueva debe ser distinta de la temporal.';
  if (/password is known to be weak|weak password/i.test(mensaje)) return 'Esa clave es muy fácil de adivinar. Elige otra.';
  if (/password should be at least/i.test(mensaje)) return 'La clave es demasiado corta.';
  if (/for security purposes/i.test(mensaje)) return 'Demasiados intentos. Espera unos segundos y vuelve a intentar.';
  const capacidad = mensaje.match(/KONYS_CAPACIDAD_EXCEDIDA:(\d+)/);
  if (capacidad) return `Esta mesa admite máximo ${capacidad[1]} personas.`;
  // F2: el nombre de sede es único; se distingue del 23505 de mesas por la restricción.
  if (mensaje.includes('sedes_nombre_key')) return 'Ya existe una sede con ese nombre.';
  // F3: restricciones de roles y perfiles, antes de los genéricos 23505/23503.
  if (mensaje.includes('roles_codigo_key')) return 'Ya existe un rol con ese código.';
  if (mensaje.includes('perfiles_email_key')) return 'Ya existe un usuario con ese correo.';
  if (mensaje.includes('perfiles_rol_id_fkey')) return 'El rol tiene usuarios asignados; reasígnalos antes de suprimirlo.';
  const mensajes = {
    '23P01': 'Ese horario acaba de ser reservado. Elige otro.',
    KONYS_MESA_NO_DISPONIBLE: 'La mesa ya no está disponible.',
    KONYS_FECHA_PASADA: 'Ese horario ya pasó.',
    KONYS_FUERA_DE_HORARIO: 'Ese horario no está habilitado.',
    KONYS_SEDE_PRINCIPAL: 'La sede principal no se puede desactivar ni eliminar.',
    KONYS_SIN_PRIVILEGIO: 'Tu rol no permite hacer este cambio.',
    KONYS_TRANSICION_INVALIDA: 'Solo se pueden cambiar reservas confirmadas.',
    KONYS_ADMIN_SEDE_EXISTE: 'Esta sede ya tiene un administrador.',
    KONYS_PERFIL_SEDE: 'El rol elegido no corresponde a la sede del usuario.',
    KONYS_ROL_PROTEGIDO: 'Este rol del sistema no se puede modificar ni suprimir.',
    KONYS_PRIVILEGIO_GLOBAL: 'Los permisos globales solo se asignan a roles de alcance global.',
    // F3C: respuestas de las Edge Functions crear-usuario y eliminar-usuario.
    KONYS_CORREO_EXISTE: 'Ya existe una cuenta con ese correo.',
    KONYS_ROL_INVALIDO: 'El rol elegido no existe o está oculto.',
    KONYS_DATOS_INVALIDOS: 'Revisa los datos de la cuenta.',
    KONYS_CLAVE_DEBIL: 'La clave temporal es muy fácil de adivinar. Elige otra.',
    KONYS_USUARIO_NO_EXISTE: 'La cuenta ya no existe.',
    KONYS_ERROR_CUENTAS: 'No se pudo completar la operación con la cuenta. Vuelve a intentar.',
    KONYS_FUNCION_NO_DISPONIBLE: 'La gestión de cuentas aún no está publicada en el servidor.',
    KONYS_SESION_VENCIDA: 'Tu sesión se cerró en el servidor. Cierra sesión y vuelve a ingresar.',
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

