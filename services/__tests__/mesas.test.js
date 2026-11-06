// RF-13: el borrado de una mesa no debe parecer exitoso si afecta 0 filas.
import { borrar } from '../mesas';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));

// Cadena de supabase: from().delete().eq().select()
function encadenar(deleteFn, respuesta) {
  const select = jest.fn().mockResolvedValue(respuesta);
  const eq = jest.fn().mockReturnValue({ select });
  deleteFn.mockReturnValue({ eq });
  return { deleteFn, select };
}

describe('RF-13: borrar mesa', () => {
  it('confirma el borrado cuando Supabase devuelve la fila eliminada', async () => {
    const deleteFn = jest.fn();
    encadenar(deleteFn, { data: [{ id: 'mesa-1' }], error: null });
    supabase.from.mockReturnValue({ delete: deleteFn });

    const resultado = await borrar('mesa-1');

    expect(resultado.error).toBeNull();
    expect(resultado.data).toEqual([{ id: 'mesa-1' }]);
  });

  it('traduce el conflicto de reservas (RN-07)', async () => {
    const deleteFn = jest.fn();
    encadenar(deleteFn, { data: null, error: { code: '23503' } });
    supabase.from.mockReturnValue({ delete: deleteFn });

    const resultado = await borrar('mesa-1');

    expect(resultado.error).toContain('inactívala en su lugar');
  });

  it('avisa cuando el borrado no afecta ninguna fila', async () => {
    const deleteFn = jest.fn();
    encadenar(deleteFn, { data: [], error: null });
    supabase.from.mockReturnValue({ delete: deleteFn });

    const resultado = await borrar('mesa-1');

    expect(resultado.data).toBeNull();
    expect(resultado.error).toContain('No se pudo borrar');
  });
});
