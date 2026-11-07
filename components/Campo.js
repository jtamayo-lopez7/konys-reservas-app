// Campo de formulario con etiqueta, ayuda y error (componente Campo de los mockups).
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/colors';

export default function Campo({ etiqueta, error, ayuda, style, ...entrada }) {
  return <View style={[styles.campo, style]}>
    <Text style={styles.etiqueta}>{etiqueta}</Text>
    <TextInput accessibilityLabel={etiqueta} placeholderTextColor={colors.secundario}
      style={[styles.input, !!error && styles.inputError]} {...entrada} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!error && !!ayuda && <Text style={styles.ayuda}>{ayuda}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  campo: { alignSelf: 'stretch', gap: 6 },
  etiqueta: { fontSize: 14, color: colors.secundario },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borde, backgroundColor: colors.blanco, borderRadius: 10, padding: 12, fontSize: 16, color: colors.texto },
  inputError: { borderColor: colors.error, borderWidth: 1.5 },
  error: { fontSize: 13, color: colors.error },
  ayuda: { fontSize: 13, color: colors.secundario },
});
