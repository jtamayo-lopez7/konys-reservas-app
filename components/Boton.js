import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';

export default function Boton({ titulo, onPress, disabled = false, cargando = false }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || cargando, busy: cargando }}
      disabled={disabled || cargando} onPress={onPress}
      style={({ pressed }) => [styles.boton, (disabled || cargando) && styles.deshabilitado, pressed && styles.presionado]}>
      {cargando ? <ActivityIndicator color={colors.blanco} /> : <Text style={styles.texto}>{titulo}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
  texto: { color: colors.blanco, fontSize: 16, fontWeight: '600' },
  deshabilitado: { opacity: 0.5 },
  presionado: { opacity: 0.8 },
});
