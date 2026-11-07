// I-04 / decisión 2.7: aviso de derechos, solo en la bienvenida y en el acceso de personal.
import { StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';

export const TEXTO_FOOTER = '© 2026 Jorge Tamayo y Joan Sanchez. Todos los derechos reservados.';

export default function Footer() {
  return <Text style={styles.texto}>{TEXTO_FOOTER}</Text>;
}

const styles = StyleSheet.create({
  texto: { fontSize: 11, lineHeight: 15, color: colors.secundario, textAlign: 'center', paddingHorizontal: 24 },
});
