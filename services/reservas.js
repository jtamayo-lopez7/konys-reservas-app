// RF-04, RF-05: disponibilidad pública y creación sin leer datos personales.
// RF-12: listado y cambio de estado para el administrador (las reservas no se borran).
import { supabase } from './supabase';
import { consultar } from './consultas';
import { traducir } from './errores';
import { obtenerActiva } from './mesas';
import { listar } from './horarios';
import { generarFechas, generarSlots } from './slots';
import { validarReserva } from './validaciones';

export function slotsOcupados(mesaId, fecha) {
  return consultar(() => supabase.rpc('slots_ocupados', { p_mesa_id: mesaId, p_fecha: fecha }));
}

export async function crear(mesaId, fecha, horaInicio, form) {
  const [mesa, horarios] = await Promise.all([obtenerActiva(mesaId), listar()]);
  if (mesa.error || horarios.error) return { data: null, error: mesa.error || horarios.error };
  if (!mesa.data) return { data: null, error: traducir({ message: 'KONYS_MESA_NO_DISPONIBLE' }) };
  const validacion = validarReserva(form, mesa.data.capacidad);
  if (!validacion.valido) return { data: null, error: Object.values(validacion.errores)[0] };
  const ahora = new Date();
  if (!generarFechas(horarios.data, ahora).some((d) => d.fecha === fecha && d.habilitada)) {
    return { data: null, error: traducir({ message: 'KONYS_FUERA_DE_HORARIO' }) };
  }
  const ocupados = await slotsOcupados(mesaId, fecha);
  if (ocupados.error) return { data: null, error: ocupados.error };
  const slot = generarSlots(fecha, horarios.data, ocupados.data, new Date()).find((s) => s.hora_inicio === horaInicio);
  if (!slot || slot.pasado) return { data: null, error: traducir({ message: slot ? 'KONYS_FECHA_PASADA' : 'KONYS_FUERA_DE_HORARIO' }) };
  if (slot.ocupado) return { data: null, error: traducir({ code: '23P01' }) };
  const datos = {
    mesa_id: mesaId,
    fecha,
    hora_inicio: slot.hora_inicio,
    hora_fin: slot.hora_fin,
    cliente_nombre: form.cliente_nombre.trim(),
    cliente_contacto: form.cliente_contacto?.trim() || null,
    num_personas: Number(form.num_personas),
    acepta_tratamiento_datos: true,
  };
  // No encadenar select: anon puede insertar, pero no leer reservas.
  const resultado = await consultar(() => supabase.from('reservas').insert(datos));
  return resultado.error ? resultado : {
    data: { ...datos, mesa_nombre: mesa.data.nombre, zona: mesa.data.zona }, error: null,
  };
}

// RF-12: el admin sí lee reservas; se trae el nombre de la mesa con un join.
export function listarReservas({ fecha = null, manana = false, mesaId = null } = {}) {
  let consulta = supabase.from('reservas')
    .select('id,mesa_id,mesa:mesas(nombre),cliente_nombre,cliente_contacto,num_personas,fecha,hora_inicio,hora_fin,estado')
    .order('fecha', { ascending: !manana }).order('hora_inicio');
  if (fecha) consulta = consulta.eq('fecha', fecha);
  if (mesaId) consulta = consulta.eq('mesa_id', mesaId);
  return consultar(() => consulta);
}

// RN-06: no se borran reservas; solo cambian de estado.
export function cambiarEstado(id, estado) {
  return consultar(() => supabase.from('reservas')
    .update({ estado }).eq('id', id).select('id,estado').single());
}
