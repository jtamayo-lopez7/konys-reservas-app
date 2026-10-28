import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';
import { leerFecha } from '../services/slots';

export default function SelectorFecha({ fechas, seleccionada, onChange, disabled }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lista}>
    {fechas.map(({ fecha, habilitada }) => {
      const dia = leerFecha(fecha);
      const elegida = fecha === seleccionada;
      return <Pressable key={fecha} disabled={disabled || !habilitada} onPress={() => onChange(fecha)}
        accessibilityRole="button" accessibilityLabel={dia.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
        accessibilityState={{ selected: elegida, disabled: disabled || !habilitada }}
        style={[styles.dia, elegida && styles.seleccionado, !habilitada && styles.deshabilitado]}>
        <Text style={[styles.texto, elegida && styles.claro]}>{dia.toLocaleDateString('es-CO', { weekday: 'short' })}</Text>
        <Text style={[styles.numero, elegida && styles.claro]}>{dia.getDate()}</Text>
        <Text style={[styles.texto, elegida && styles.claro]}>{dia.toLocaleDateString('es-CO', { month: 'short' })}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  lista: { gap: 8, paddingVertical: 4 },
  dia: { minWidth: 60, minHeight: 82, padding: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borde, borderRadius: 12, backgroundColor: colors.blanco, gap: 3 },
  seleccionado: { backgroundColor: colors.primario, borderColor: colors.primario },
  deshabilitado: { opacity: 0.35, backgroundColor: colors.ocupado },
  texto: { fontSize: 12, color: colors.secundario },
  numero: { fontSize: 20, fontWeight: '700', color: colors.texto },
  claro: { color: colors.blanco },
});
