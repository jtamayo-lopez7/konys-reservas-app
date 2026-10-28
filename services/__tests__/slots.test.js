import { fechaLocal, generarFechas, generarSlots, seSolapan } from '../slots';

const horarios = [
  { dia_semana: 'jueves', jornada: 'almuerzo', hora_inicio: '12:30:00', hora_fin: '14:30:00', duracion_slot: 60, activo: true },
  { dia_semana: 'jueves', jornada: 'noche', hora_inicio: '17:00:00', hora_fin: '23:00:00', duracion_slot: 60, activo: true },
];
const fecha = '2026-10-29';
const temprano = new Date(2026, 9, 29, 10);

describe('U-01: disponibilidad', () => {
  it('genera las ocho franjas del documento sin exceder el cierre', () => {
    expect(generarSlots(fecha, horarios, [], temprano).map((s) => s.hora_inicio))
      .toEqual(['12:30', '13:30', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']);
  });
  it('bloquea cualquier solape y permite intervalos contiguos', () => {
    const slots = generarSlots(fecha, horarios, [{ hora_inicio: '17:30:00', hora_fin: '18:30:00' }], temprano);
    expect(slots.filter((s) => s.ocupado).map((s) => s.hora_inicio)).toEqual(['17:00', '18:00']);
    expect(slots.find((s) => s.hora_inicio === '19:00').disponible).toBe(true);
    expect(seSolapan('17:00', '18:00', '18:00:00', '19:00:00')).toBe(false);
  });
  it('no genera slots de días o jornadas inactivos', () => {
    expect(generarSlots('2026-10-30', horarios, [], temprano)).toEqual([]);
    expect(generarSlots(fecha, horarios.map((h) => ({ ...h, activo: false })), [], temprano)).toEqual([]);
  });
  it('a las 18:15 bloquea 17:00 y 18:00 pero permite 19:00', () => {
    const slots = generarSlots(fecha, horarios, [], new Date(2026, 9, 29, 18, 15));
    expect(slots.find((s) => s.hora_inicio === '17:00').disponible).toBe(false);
    expect(slots.find((s) => s.hora_inicio === '18:00').disponible).toBe(false);
    expect(slots.find((s) => s.hora_inicio === '19:00').disponible).toBe(true);
  });
  it('respeta duraciones configurables y descarta un último tramo incompleto', () => {
    const h = [{ ...horarios[0], duracion_slot: 45 }];
    expect(generarSlots(fecha, h, [], temprano).map((s) => [s.hora_inicio, s.hora_fin]))
      .toEqual([['12:30', '13:15'], ['13:15', '14:00']]);
  });
  it('genera 14 fechas locales cruzando de mes y deshabilita hoy al cerrar', () => {
    const fechas = generarFechas(horarios, new Date(2026, 9, 29, 23, 1));
    expect(fechas).toHaveLength(14);
    expect(fechas[0]).toEqual({ fecha, habilitada: false });
    expect(fechas[13].fecha).toBe('2026-11-11');
    expect(fechas.find((f) => f.fecha === '2026-11-05').habilitada).toBe(true);
    expect(fechaLocal(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
  });
});
