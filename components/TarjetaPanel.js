// F3 (05b, 05c, 05d): tarjeta del panel del personal (componente TarjetaPanel de los mockups).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';

export default function TarjetaPanel({ titulo, detalle, icono, onPress, etiqueta }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${titulo}. ${detalle ?? ''}`} onPress={onPress}
    style={({ pressed }) => [styles.tarjeta, pressed && styles.presionada]}>
    {!!icono && <View style={styles.icono}><Ionicons name={icono} size={22} color={colors.primario} /></View>}
    <View style={styles.contenido}>
      <View style={styles.fila}>
        <Text style={styles.titulo}>{titulo}</Text>
        {!!etiqueta && <Text style={styles.etiqueta}>{etiqueta}</Text>}
      </View>
      {!!detalle && <Text style={styles.detalle}>{detalle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.texto} />
  </Pressable>;
}

const styles = StyleSheet.create({
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  presionada: { opacity: 0.8 },
  icono: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.fondo, alignItems: 'center', justifyContent: 'center' },
  contenido: { flex: 1, gap: 3 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  titulo: { fontSize: 16, fontWeight: '600', color: colors.texto },
  etiqueta: { fontSize: 12, color: colors.error, fontWeight: '600' },
  detalle: { fontSize: 13, color: colors.secundario, lineHeight: 18 },
});
