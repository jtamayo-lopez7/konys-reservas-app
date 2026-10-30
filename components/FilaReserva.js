// RF-12: tarjeta administrativa de reserva con Cancelar y Completar (RN-06: no se borra).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { ESTADOS } from '../constants/dominio';
import { leerFecha } from '../services/slots';

const tono = { confirmada: colors.primario, cancelada: colors.error, completada: colors.secundario };

export default function FilaReserva({ reserva, procesando, onCancelar, onCompletar }) {
  const fecha = leerFecha(reserva.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  const confirmada = reserva.estado === 'confirmada';
  return <View style={styles.tarjeta}>
    <View style={styles.contenido}>
      <Text style={styles.nombre}>{reserva.cliente_nombre}</Text>
      <Text style={styles.detalle}>{reserva.mesa?.nombre ?? 'Mesa'} · {fecha} · {reserva.hora_inicio.slice(0, 5)}–{reserva.hora_fin.slice(0, 5)}</Text>
      <Text style={styles.detalle}>{reserva.num_personas} personas{reserva.cliente_contacto ? ` · ${reserva.cliente_contacto}` : ''}</Text>
      <Text style={[styles.estado, { color: tono[reserva.estado] ?? colors.texto }]}>{ESTADOS[reserva.estado]}</Text>
    </View>
    {confirmada && <View style={styles.acciones}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Cancelar reserva de ${reserva.cliente_nombre}`} disabled={procesando}
        onPress={onCancelar} style={[styles.accion, styles.cancelar]} hitSlop={8}>
        <Text style={styles.textoAccion}>Cancelar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Completar reserva de ${reserva.cliente_nombre}`} disabled={procesando}
        onPress={onCompletar} style={styles.accion} hitSlop={8}>
        <Text style={[styles.textoAccion, styles.claro]}>Completar</Text>
      </Pressable>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  tarjeta: { padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, marginBottom: 10, gap: 10 },
  contenido: { gap: 3 },
  nombre: { fontSize: 16, fontWeight: '700', color: colors.texto },
  detalle: { color: colors.secundario, fontSize: 14, lineHeight: 20 },
  estado: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  acciones: { flexDirection: 'row', gap: 8 },
  accion: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.primario, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
  cancelar: { backgroundColor: colors.blanco, borderColor: colors.error },
  textoAccion: { color: colors.primario, fontWeight: '600', fontSize: 14 },
  claro: { color: colors.blanco },
});
