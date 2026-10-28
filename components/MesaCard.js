import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { ZONAS } from '../constants/dominio';
import Foto from './Foto';

export default function MesaCard({ mesa, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`${mesa.nombre}, ${ZONAS[mesa.zona]}, hasta ${mesa.capacidad} personas. Reservar mesa`}
      style={({ pressed }) => [styles.tarjeta, pressed && styles.presionada]}>
      <Foto uri={mesa.foto_url} nombre={mesa.nombre} />
      <View style={styles.contenido}>
        <Text style={styles.nombre}>{mesa.nombre}</Text>
        <Text style={styles.detalle}>{ZONAS[mesa.zona]}</Text>
        <Text style={styles.detalle}>Hasta {mesa.capacidad} personas</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.secundario} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, marginBottom: 12 },
  contenido: { flex: 1, gap: 5 },
  nombre: { fontSize: 18, fontWeight: '700', color: colors.texto },
  detalle: { color: colors.secundario, fontSize: 14 },
  presionada: { opacity: 0.7 },
});
