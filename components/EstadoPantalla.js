import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import Boton from './Boton';

export default function EstadoPantalla({ cargando, mensaje, onReintentar }) {
  return (
    <View style={styles.contenedor}>
      {cargando && <ActivityIndicator size="large" color={colors.primario} />}
      <Text accessibilityRole={onReintentar ? 'alert' : 'text'} style={styles.texto}>
        {cargando ? 'Cargando…' : mensaje}
      </Text>
      {onReintentar && <Boton titulo="Reintentar" onPress={onReintentar} />}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.fondo, padding: 24, gap: 16, justifyContent: 'center', alignItems: 'center' },
  texto: { color: colors.texto, fontSize: 16, textAlign: 'center' },
});
