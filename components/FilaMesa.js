// RF-10, RF-13: fila administrativa de mesa (presentacional).
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { ZONAS } from '../constants/dominio';
import Foto from './Foto';

export default function FilaMesa({ mesa, procesando, onCambiarEstado, onEditar, onBorrar }) {
  return <View style={styles.fila}>
    <Foto uri={mesa.foto_url} nombre={mesa.nombre} />
    <View style={styles.contenido}>
      <Text style={styles.nombre}>{mesa.nombre}</Text>
      <Text style={styles.detalle}>{ZONAS[mesa.zona]} · hasta {mesa.capacidad} personas</Text>
      <Text style={styles.estado}>{mesa.activa ? 'Activa' : 'Inactiva'}</Text>
    </View>
    <Switch accessibilityLabel={`Mesa ${mesa.nombre} activa`} value={mesa.activa} disabled={procesando}
      onValueChange={onCambiarEstado} trackColor={{ true: colors.primario, false: colors.ocupado }} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${mesa.nombre}`} disabled={procesando}
      onPress={onEditar} style={styles.accion} hitSlop={8}>
      <Ionicons name="pencil-outline" size={22} color={colors.primario} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Borrar ${mesa.nombre}`} disabled={procesando}
      onPress={onBorrar} style={styles.accion} hitSlop={8}>
      <Ionicons name="trash-outline" size={22} color={colors.error} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, marginBottom: 10 },
  contenido: { flex: 1, gap: 3 },
  nombre: { fontSize: 16, fontWeight: '700', color: colors.texto },
  detalle: { color: colors.secundario, fontSize: 13 },
  estado: { color: colors.texto, fontSize: 13, fontWeight: '600' },
  accion: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
