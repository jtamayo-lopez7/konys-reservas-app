// RF-03, RF-04: fechas locales y disponibilidad, sin acceso a Supabase.
import { DIAS, DIAS_RESERVA } from '../constants/dominio';

export function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function leerFecha(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function minutos(hora) {
  const [horas, mins] = hora.split(':').map(Number);
  return horas * 60 + mins;
}

function hora(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

export function seSolapan(inicio, fin, otroInicio, otroFin) {
  return minutos(inicio) < minutos(otroFin) && minutos(otroInicio) < minutos(fin);
}

export function generarSlots(fecha, horarios, ocupados = [], ahora = new Date()) {
  const dia = DIAS[leerFecha(fecha).getDay()];
  return horarios.filter((h) => h.activo && h.dia_semana === dia).flatMap((h) => {
    const slots = [];
    const paso = Number(h.duracion_slot);
    if (!Number.isInteger(paso) || paso < 15 || paso > 240) return slots;
    for (let inicio = minutos(h.hora_inicio); inicio + paso <= minutos(h.hora_fin); inicio += paso) {
      const hora_inicio = hora(inicio);
      const hora_fin = hora(inicio + paso);
      const instante = leerFecha(fecha);
      instante.setHours(Math.floor(inicio / 60), inicio % 60, 0, 0);
      const pasado = instante < ahora;
      const ocupado = ocupados.some((o) => seSolapan(hora_inicio, hora_fin, o.hora_inicio, o.hora_fin));
      slots.push({ hora_inicio, hora_fin, jornada: h.jornada, pasado, ocupado, disponible: !pasado && !ocupado });
    }
    return slots;
  }).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
}

export function generarFechas(horarios, ahora = new Date()) {
  return Array.from({ length: DIAS_RESERVA }, (_, indice) => {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + indice);
    const valor = fechaLocal(fecha);
    return { fecha: valor, habilitada: generarSlots(valor, horarios, [], ahora).some((slot) => slot.disponible) };
  });
}
