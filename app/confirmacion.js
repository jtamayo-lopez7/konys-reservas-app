import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { ZONAS } from '../constants/dominio';
import { leerFecha } from '../services/slots';
import { useReservaConfirmada } from '../hooks/ReservaConfirmada';
import Boton from '../components/Boton';

export default function ConfirmacionScreen() {
  const { reserva, setReserva } = useReservaConfirmada();
  const volver = useCallback(() => {
    setReserva(null);
    router.replace('/');
  }, [setReserva]);
  useFocusEffect(useCallback(() => {
    const evento = BackHandler.addEventListener('hardwareBackPress', () => { volver(); return true; });
    return () => evento.remove();
  }, [volver]));

  const filas = reserva ? [
    ['Mesa', reserva.mesa_nombre],
    ['Zona', ZONAS[reserva.zona]],
    ['Fecha', leerFecha(reserva.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
    ['Hora', `${reserva.hora_inicio} a ${reserva.hora_fin}`],
    ['Personas', String(reserva.num_personas)],
    ['Nombre', reserva.cliente_nombre],
  ] : [];

  return <SafeAreaView style={styles.pantalla}>
    <ScrollView contentContainerStyle={styles.contenido}>
      <Ionicons name={reserva ? 'checkmark-circle-outline' : 'information-circle-outline'} size={68} color={colors.primario} style={styles.icono} />
      <Text accessibilityRole="header" style={styles.titulo}>{reserva ? 'Reserva confirmada' : 'No hay una confirmación para mostrar'}</Text>
      {reserva && <>
        <Text style={styles.subtitulo}>Te esperamos en Konys Pizza.</Text>
        <View style={styles.tarjeta}>{filas.map(([etiqueta, valor]) => <View key={etiqueta} style={styles.fila}>
          <Text style={styles.etiqueta}>{etiqueta}</Text><Text style={styles.valor}>{valor}</Text>
        </View>)}</View>
      </>}
      <View style={styles.boton}><Boton titulo="Volver al inicio" onPress={volver} /></View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { flexGrow: 1, padding: 16, paddingTop: 40, gap: 16 },
  icono: { alignSelf: 'center' },
  titulo: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: colors.primario },
  subtitulo: { fontSize: 16, textAlign: 'center', color: colors.secundario },
  tarjeta: { backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, paddingHorizontal: 16 },
  fila: { flexDirection: 'row', gap: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borde },
  etiqueta: { width: 65, color: colors.secundario, fontSize: 15 },
  valor: { flex: 1, textAlign: 'right', fontSize: 15, color: colors.texto, fontWeight: '500' },
  boton: { marginTop: 'auto', paddingTop: 24, paddingBottom: 16 },
});
