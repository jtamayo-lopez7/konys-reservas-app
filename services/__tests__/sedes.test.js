import { cambiarEstado, entradaDirecta, listarActivas } from '../sedes';
import { supabase } from '../supabase';
import { traducir } from '../errores';
import { validarSede } from '../validaciones';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));

// Cadena encadenable que resuelve con la respuesta dada al final (then).
function cadena(respuesta) {
  const c = {};
  for (const m of ['select', 'eq', 'order', 'update', 'insert', 'single', 'maybeSingle']) c[m] = jest.fn(() => c);
  c.then = (resolver, rechazar) => Promise.resolve(respuesta).then(resolver, rechazar);
  return c;
}

beforeEach(() => jest.clearAllMocks());

describe('U-05 sedes (RF-15, RF-16)', () => {
  it('listarActivas consulta solo sedes activas, la principal primero', async () => {
    const c = cadena({ data: [{ id: 'a', nombre: 'Sede Cabecera', es_principal: true }], error: null });
    supabase.from.mockReturnValue(c);
    const { data, error } = await listarActivas();
    expect(supabase.from).toHaveBeenCalledWith('sedes');
    expect(c.eq).toHaveBeenCalledWith('activa', true);
    expect(c.order).toHaveBeenNthCalledWith(1, 'es_principal', { ascending: false });
    expect(error).toBeNull();
    expect(data[0]).toMatchObject({ nombre: 'Sede Cabecera', es_principal: true });
  });

  it('traduce el rechazo del servidor al desactivar la sede principal (D-03)', async () => {
    supabase.from.mockReturnValue(cadena({ data: null, error: { code: 'P0001', message: 'KONYS_SEDE_PRINCIPAL' } }));
    const { data, error } = await cambiarEstado('a', false);
    expect(data).toBeNull();
    expect(error).toContain('sede principal no se puede desactivar');
  });

  it('distingue el nombre de sede repetido del de mesa', () => {
    expect(traducir({ code: '23505', message: 'duplicate key value violates unique constraint "sedes_nombre_key"' })).toBe('Ya existe una sede con ese nombre.');
    expect(traducir({ code: '23505', message: 'violates unique constraint "mesas_sede_nombre_unico"' })).toContain('mesa');
  });

  it('valida nombre, dirección y teléfono de la sede', () => {
    expect(validarSede({ nombre: 'Sede Cañaveral', direccion: 'Calle 30 # 25-71', telefono: '' }).valido).toBe(true);
    const { errores } = validarSede({ nombre: 'S', direccion: '', telefono: '1'.repeat(31) });
    expect(Object.keys(errores).sort()).toEqual(['direccion', 'nombre', 'telefono']);
  });

  it('con una sola sede entra directo solo en el primer arranque', () => {
    const una = [{ id: 'a' }];
    expect(entradaDirecta(una, true)).toBe(true);
    expect(entradaDirecta(una, false)).toBe(false);
  });

  it('con varias sedes, ninguna o datos inválidos siempre muestra la lista', () => {
    expect(entradaDirecta([{ id: 'a' }, { id: 'b' }], true)).toBe(false);
    expect(entradaDirecta([], true)).toBe(false);
    expect(entradaDirecta(null, true)).toBe(false);
  });
});
