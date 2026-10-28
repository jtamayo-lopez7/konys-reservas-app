import { crear } from '../reservas';
import { supabase } from '../supabase';
import { obtenerActiva } from '../mesas';
import { listar } from '../horarios';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('../mesas', () => ({ obtenerActiva: jest.fn() }));
jest.mock('../horarios', () => ({ listar: jest.fn() }));

const form = { cliente_nombre: ' Laura Gómez ', cliente_contacto: '', num_personas: '4', acepta_tratamiento_datos: true };
const horario = { dia_semana: 'jueves', jornada: 'noche', hora_inicio: '17:00:00', hora_fin: '23:00:00', duracion_slot: 60, activo: true };
let insertar;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date(2026, 9, 29, 10) });
  obtenerActiva.mockResolvedValue({ data: { id: 'mesa-1', nombre: 'Mesa 1', zona: 'salon', capacidad: 4 }, error: null });
  listar.mockResolvedValue({ data: [horario], error: null });
  supabase.rpc.mockResolvedValue({ data: [], error: null });
  insertar = jest.fn().mockResolvedValue({ data: null, error: null });
  supabase.from.mockReturnValue({ insert: insertar });
});
afterEach(() => jest.useRealTimers());

describe('creación segura de reservas', () => {
  it('reconsulta disponibilidad, inserta sin select y confirma con datos locales', async () => {
    const resultado = await crear('mesa-1', '2026-10-29', '19:00', form);
    expect(supabase.rpc).toHaveBeenCalledWith('slots_ocupados', { p_mesa_id: 'mesa-1', p_fecha: '2026-10-29' });
    expect(supabase.from).toHaveBeenCalledWith('reservas');
    expect(insertar).toHaveBeenCalledWith(expect.objectContaining({ cliente_nombre: 'Laura Gómez', num_personas: 4, cliente_contacto: null, hora_fin: '20:00' }));
    expect(resultado.error).toBeNull();
    expect(resultado.data.mesa_nombre).toBe('Mesa 1');
  });
  it('no inserta si otra persona ocupó una parte del horario', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ hora_inicio: '19:30:00', hora_fin: '20:30:00' }], error: null });
    const resultado = await crear('mesa-1', '2026-10-29', '19:00', form);
    expect(insertar).not.toHaveBeenCalled();
    expect(resultado.error).toContain('acaba de ser reservado');
  });
  it('traduce el conflicto atómico de una reserva simultánea', async () => {
    insertar.mockResolvedValue({ error: { code: '23P01' } });
    const resultado = await crear('mesa-1', '2026-10-29', '19:00', form);
    expect(resultado.data).toBeNull();
    expect(resultado.error).toContain('acaba de ser reservado');
  });
  it('revalida la capacidad actual antes de insertar', async () => {
    obtenerActiva.mockResolvedValue({ data: { capacidad: 2 }, error: null });
    expect((await crear('mesa-1', '2026-10-29', '19:00', form)).error).toContain('entre 1 y 2');
    expect(insertar).not.toHaveBeenCalled();
  });
  it('rechaza una mesa inactiva, fecha fuera de ventana, hora desalineada o pasada', async () => {
    for (const [fecha, hora] of [['2026-11-12', '19:00'], ['2026-10-29', '19:30']]) {
      expect((await crear('mesa-1', fecha, hora, form)).error).toBeTruthy();
    }
    jest.setSystemTime(new Date(2026, 9, 29, 19, 1));
    expect((await crear('mesa-1', '2026-10-29', '19:00', form)).error).toContain('ya pasó');
    obtenerActiva.mockResolvedValue({ data: null, error: null });
    expect((await crear('mesa-1', '2026-10-29', '20:00', form)).error).toContain('mesa ya no');
    expect(insertar).not.toHaveBeenCalled();
  });
  it('no inserta sin autorización ni si falla la consulta de disponibilidad', async () => {
    expect((await crear('mesa-1', '2026-10-29', '19:00', { ...form, acepta_tratamiento_datos: false })).error).toContain('Autoriza');
    supabase.rpc.mockRejectedValue(new TypeError('Network request failed'));
    expect((await crear('mesa-1', '2026-10-29', '19:00', form)).error).toContain('Sin conexión');
    expect(insertar).not.toHaveBeenCalled();
  });
});
