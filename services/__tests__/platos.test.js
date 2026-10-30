// RF-14: la actualización parcial no debe corromper el precio con NaN.
import { actualizar } from '../platos';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));

// Cadena de supabase: from().update().eq().select().single()
function encadenar(update) {
  const single = jest.fn().mockResolvedValue({ data: {}, error: null });
  const select = jest.fn().mockReturnValue({ single });
  const eq = jest.fn().mockReturnValue({ select });
  update.mockReturnValue({ eq });
  return { update, single };
}

describe('RF-14: alternar disponibilidad', () => {
  it('no envía precio cuando el cambio solo alterna disponible', async () => {
    const update = jest.fn();
    encadenar(update);
    supabase.from.mockReturnValue({ update });

    await actualizar('plato-1', { disponible: false });

    expect(update).toHaveBeenCalledWith({ disponible: false });
  });

  it('convierte el precio cuando el formulario lo envía', async () => {
    const update = jest.fn();
    encadenar(update);
    supabase.from.mockReturnValue({ update });

    await actualizar('plato-1', { nombre: 'Pizza', precio: '32000', disponible: true });

    expect(update).toHaveBeenCalledWith({ nombre: 'Pizza', precio: 32000, disponible: true });
  });
});
