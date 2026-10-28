import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';

export default function SlotButton({ slot, seleccionado, onPress, disabled }) {
  return <Pressable accessibilityRole="button"
    accessibilityLabel={`${slot.hora_inicio} a ${slot.hora_fin}${slot.ocupado ? ', ocupado' : slot.pasado ? ', pasado' : ''}`}
    accessibilityState={{ disabled: disabled || !slot.disponible, selected: seleccionado }}
    disabled={disabled || !slot.disponible} onPress={onPress}
    style={[styles.slot, !slot.disponible && styles.ocupado, seleccionado && styles.seleccionado]}>
    <Text style={[styles.texto, seleccionado && styles.claro]}>{slot.hora_inicio}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  slot: { minWidth: 88, minHeight: 44, padding: 12, borderWidth: 1, borderColor: colors.borde, borderRadius: 10, alignItems: 'center', backgroundColor: colors.blanco },
  ocupado: { backgroundColor: colors.ocupado },
  seleccionado: { backgroundColor: colors.primario, borderColor: colors.primario },
  texto: { color: colors.texto, fontSize: 16 },
  claro: { color: colors.blanco },
});
