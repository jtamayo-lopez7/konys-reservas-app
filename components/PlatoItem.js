import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import Foto from './Foto';

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function PlatoItem({ plato }) {
  return <View style={styles.tarjeta}>
    <View style={styles.contenido}>
      <Text style={styles.nombre}>{plato.nombre}</Text>
      {!!plato.descripcion && <Text style={styles.descripcion}>{plato.descripcion}</Text>}
      <Text style={styles.precio}>{pesos.format(plato.precio)}</Text>
    </View>
    <Foto uri={plato.foto_url} nombre={plato.nombre} />
  </View>;
}

const styles = StyleSheet.create({
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: colors.borde, backgroundColor: colors.blanco, borderRadius: 14, marginBottom: 12 },
  contenido: { flex: 1, gap: 5 },
  nombre: { color: colors.texto, fontSize: 17, fontWeight: '600' },
  descripcion: { color: colors.secundario, fontSize: 14, lineHeight: 21 },
  precio: { color: colors.primario, fontWeight: '700', fontSize: 16 },
});
