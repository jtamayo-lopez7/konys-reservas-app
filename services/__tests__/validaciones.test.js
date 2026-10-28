import { validarReserva } from '../validaciones';

const base = { cliente_nombre: 'Laura Gómez', num_personas: '4', cliente_contacto: '', acepta_tratamiento_datos: true };
describe('U-02: formulario de reserva', () => {
  it('acepta límites de nombre y capacidad, con teléfono opcional', () => {
    for (const nombre of [' Ab ', 'a'.repeat(80)]) {
      expect(validarReserva({ ...base, cliente_nombre: nombre }, 4).valido).toBe(true);
    }
    expect(validarReserva({ ...base, num_personas: 1, cliente_contacto: '1'.repeat(30) }, 4).valido).toBe(true);
  });
  it.each(['', ' ', 'a', 'a'.repeat(81)])('rechaza nombre inválido %j', (cliente_nombre) => {
    expect(validarReserva({ ...base, cliente_nombre }, 4).errores.cliente_nombre).toBeDefined();
  });
  it.each(['', '0', '-1', '5', '1.5', 'abc'])('rechaza personas inválidas %j', (num_personas) => {
    expect(validarReserva({ ...base, num_personas }, 4).errores.num_personas).toBeDefined();
  });
  it('rechaza teléfono demasiado largo y consentimiento ausente', () => {
    expect(validarReserva({ ...base, cliente_contacto: '1'.repeat(31) }, 4).valido).toBe(false);
    for (const acepta_tratamiento_datos of [false, undefined, 'true']) {
      expect(validarReserva({ ...base, acepta_tratamiento_datos }, 4).valido).toBe(false);
    }
  });
});
