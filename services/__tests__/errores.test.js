import { traducir } from '../errores';
import { consultar } from '../consultas';

describe('U-03: errores', () => {
  it.each([
    [{ code: '23P01' }, 'Ese horario acaba de ser reservado. Elige otro.'],
    [{ message: 'KONYS_CAPACIDAD_EXCEDIDA:4' }, 'Esta mesa admite máximo 4 personas.'],
    [{ message: 'KONYS_MESA_NO_DISPONIBLE' }, 'La mesa ya no está disponible.'],
    [{ message: 'KONYS_FECHA_PASADA' }, 'Ese horario ya pasó.'],
    [{ message: 'KONYS_FUERA_DE_HORARIO' }, 'Ese horario no está habilitado.'],
    [{ code: '23505' }, 'Ya existe una mesa con ese nombre.'],
    [{ code: '23503' }, 'La mesa tiene reservas; inactívala en su lugar.'],
    [{ code: '42501' }, 'Permiso denegado. Revisa la sesión o contacta al administrador.'],
    [{ message: 'Invalid login credentials' }, 'Correo o clave incorrectos.'],
    [{ message: 'New password should be different from the old password.' }, 'La clave nueva debe ser distinta de la temporal.'],
    [{ message: 'Password is known to be weak and easy to guess, please choose a different one.' }, 'Esa clave es muy fácil de adivinar. Elige otra.'],
    [{ message: 'Email not confirmed' }, 'Tu correo aún no está confirmado. Habla con el administrador.'],
    [{ message: 'For security purposes, you can only request this after 39 seconds.' }, 'Demasiados intentos. Espera unos segundos y vuelve a intentar.'],
    [new TypeError('Network request failed'), 'Sin conexión a internet. Revisa tu red y vuelve a intentar.'],
    [{ message: 'Failed to fetch' }, 'Sin conexión a internet. Revisa tu red y vuelve a intentar.'],
    [{ message: 'KONYS_SIN_PRIVILEGIO' }, 'Tu rol no permite hacer este cambio.'],
    [{ message: 'KONYS_TRANSICION_INVALIDA' }, 'Solo se pueden cambiar reservas confirmadas.'],
    [{ message: 'KONYS_ADMIN_SEDE_EXISTE' }, 'Esta sede ya tiene un administrador.'],
    [{ message: 'KONYS_PERFIL_SEDE' }, 'El rol elegido no corresponde a la sede del usuario.'],
    [{ message: 'KONYS_ROL_PROTEGIDO' }, 'Este rol del sistema no se puede modificar ni suprimir.'],
    [{ message: 'KONYS_PRIVILEGIO_GLOBAL' }, 'Los permisos globales solo se asignan a roles de alcance global.'],
    [{ code: '23505', message: 'duplicate key value violates unique constraint "roles_codigo_key"' }, 'Ya existe un rol con ese código.'],
    [{ code: '23505', message: 'duplicate key value violates unique constraint "perfiles_email_key"' }, 'Ya existe un usuario con ese correo.'],
    [{ code: '23503', message: 'update or delete on table "roles" violates foreign key constraint "perfiles_rol_id_fkey"' }, 'El rol tiene usuarios asignados; reasígnalos antes de suprimirlo.'],
    [{ message: 'KONYS_CORREO_EXISTE' }, 'Ya existe una cuenta con ese correo.'],
    [{ message: 'KONYS_ROL_INVALIDO' }, 'El rol elegido no existe o está oculto.'],
    [{ message: 'KONYS_CLAVE_DEBIL' }, 'La clave temporal es muy fácil de adivinar. Elige otra.'],
    [{ message: 'KONYS_FUNCION_NO_DISPONIBLE' }, 'La gestión de cuentas aún no está publicada en el servidor.'],
    [{ message: 'KONYS_SESION_VENCIDA' }, 'Tu sesión se cerró en el servidor. Cierra sesión y vuelve a ingresar.'],
    [{ message: 'detalle interno privado' }, 'No pudimos completar la solicitud. Vuelve a intentar.'],
  ])('traduce %j', (error, esperado) => expect(traducir(error)).toBe(esperado));

  it('captura fallos de red lanzados por la consulta', async () => {
    const resultado = await consultar(() => { throw new TypeError('Network request failed'); });
    expect(resultado.data).toBeNull();
    expect(resultado.error).toContain('Sin conexión');
  });
});
