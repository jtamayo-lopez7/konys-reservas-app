import { validarMesa, validarPlato, validarHorario, validarReserva } from '../validaciones';

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

describe('RF-09: formulario de mesa', () => {
  it('acepta límites de nombre y capacidad', () => {
    expect(validarMesa({ nombre: 'a', zona: 'salon', capacidad: '1' }).valido).toBe(true);
    expect(validarMesa({ nombre: 'a'.repeat(40), zona: 'terraza', capacidad: '20' }).valido).toBe(true);
  });
  it.each([
    { nombre: '', zona: 'salon', capacidad: '4' },
    { nombre: 'a'.repeat(41), zona: 'salon', capacidad: '4' },
    { nombre: 'Mesa 1', zona: 'patio', capacidad: '4' },
    { nombre: 'Mesa 1', zona: 'salon', capacidad: '0' },
    { nombre: 'Mesa 1', zona: 'salon', capacidad: '21' },
    { nombre: 'Mesa 1', zona: 'salon', capacidad: '2.5' },
    { nombre: 'Mesa 1', zona: 'salon', capacidad: 'abc' },
  ])('rechaza %j', (form) => expect(validarMesa(form).valido).toBe(false));
});

describe('RF-11: formulario de horario', () => {
  it('acepta un rango válido con duración correcta', () => {
    expect(validarHorario({ hora_inicio: '12:30', hora_fin: '14:30', duracion_slot: '60' }).valido).toBe(true);
  });
  it('rechaza formatos de hora inválidos', () => {
    for (const [hora_inicio, hora_fin] of [['', ''], ['24:00', '25:00'], ['12:60', '14:00'], ['12', '14'], ['abc', '14:30']]) {
      expect(validarHorario({ hora_inicio, hora_fin, duracion_slot: '60' }).valido).toBe(false);
    }
  });
  it('rechaza fin menor o igual a inicio', () => {
    expect(validarHorario({ hora_inicio: '14:30', hora_fin: '12:30', duracion_slot: '60' }).errores.hora_fin).toBeDefined();
    expect(validarHorario({ hora_inicio: '12:30', hora_fin: '12:30', duracion_slot: '60' }).errores.hora_fin).toBeDefined();
  });
  it.each(['', '14', '241', '15.5', 'abc'])('rechaza duración %j', (duracion_slot) => {
    expect(validarHorario({ hora_inicio: '12:30', hora_fin: '14:30', duracion_slot }).errores.duracion_slot).toBeDefined();
  });
});

describe('RF-14: formulario de plato', () => {
  it('acepta límites de nombre y precio', () => {
    expect(validarPlato({ nombre: 'a', categoria: 'pizzas', precio: '0' }).valido).toBe(true);
    expect(validarPlato({ nombre: 'a'.repeat(80), categoria: 'combos', precio: '32000' }).valido).toBe(true);
  });
  it.each([
    { nombre: '', categoria: 'pizzas', precio: '32000' },
    { nombre: 'a'.repeat(81), categoria: 'pizzas', precio: '32000' },
    { nombre: 'Pizza', categoria: 'salados', precio: '32000' },
    { nombre: 'Pizza', categoria: 'pizzas', precio: '-1' },
    { nombre: 'Pizza', categoria: 'pizzas', precio: '1.5' },
    { nombre: 'Pizza', categoria: 'pizzas', precio: 'abc' },
  ])('rechaza %j', (form) => expect(validarPlato(form).valido).toBe(false));
});
