import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';

// variante: 'primario' (relleno) o 'secundario' (borde), como el componente Boton de los mockups.
export default function Boton({ titulo, onPress, disabled = false, cargando = false, variante = 'primario' }) {
  const secundario = variante === 'secundario';
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || cargando, busy: cargando }}
      disabled={disabled || cargando} onPress={onPress}
      style={({ pressed }) => [styles.boton, secundario && styles.secundario, (disabled || cargando) && styles.deshabilitado, pressed && styles.presionado]}>
      {cargando
        ? <ActivityIndicator color={secundario ? colors.primario : colors.blanco} />
        : <Text style={[styles.texto, secundario && styles.textoSecundario]}>{titulo}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
  secundario: { backgroundColor: colors.blanco, borderWidth: 1.5, borderColor: colors.primario },
  texto: { color: colors.blanco, fontSize: 16, fontWeight: '600' },
  textoSecundario: { color: colors.primario },
  deshabilitado: { opacity: 0.5 },
  presionado: { opacity: 0.8 },
});
