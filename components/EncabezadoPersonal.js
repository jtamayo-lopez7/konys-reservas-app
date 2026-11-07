// F3 (05b, 05c, 05d): saludo del panel con el rol y la sede, y botón para cerrar sesión.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';

export default function EncabezadoPersonal({ nombre, detalle, onSalir, saliendo }) {
  return <View style={styles.encabezado}>
    <View style={styles.fila}>
      <Text accessibilityRole="header" style={styles.saludo} numberOfLines={1}>Hola, {nombre}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" disabled={saliendo}
        onPress={onSalir} hitSlop={8} style={styles.salir}>
        <Ionicons name="log-out-outline" size={26} color={colors.texto} />
      </Pressable>
    </View>
    <Text style={styles.detalle}>{detalle}</Text>
  </View>;
}

const styles = StyleSheet.create({
  encabezado: { gap: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  saludo: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.texto },
  salir: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  detalle: { fontSize: 15, color: colors.secundario },
});
