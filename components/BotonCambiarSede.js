import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';

// Botón de borde con flechas de intercambio (mockups 01 y 04).
export default function BotonCambiarSede({ titulo = 'Cambiar sede', onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Cambiar sede" onPress={onPress} hitSlop={4}
      style={({ pressed }) => [styles.boton, pressed && styles.presionado]}>
      <Ionicons name="swap-horizontal-outline" size={16} color={colors.primario} />
      <Text style={styles.texto} numberOfLines={1}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: colors.primario, backgroundColor: colors.blanco, maxWidth: 180 },
  texto: { color: colors.primario, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  presionado: { opacity: 0.7 },
});
