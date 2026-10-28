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
    [new TypeError('Network request failed'), 'Sin conexión a internet. Revisa tu red y vuelve a intentar.'],
    [{ message: 'Failed to fetch' }, 'Sin conexión a internet. Revisa tu red y vuelve a intentar.'],
    [{ message: 'detalle interno privado' }, 'No pudimos completar la solicitud. Vuelve a intentar.'],
  ])('traduce %j', (error, esperado) => expect(traducir(error)).toBe(esperado));

  it('captura fallos de red lanzados por la consulta', async () => {
    const resultado = await consultar(() => { throw new TypeError('Network request failed'); });
    expect(resultado.data).toBeNull();
    expect(resultado.error).toContain('Sin conexión');
  });
});
