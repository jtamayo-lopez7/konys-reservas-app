import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { colors } from '../../constants/colors';
import { listarActivas } from '../../services/mesas';
import Boton from '../../components/Boton';
import MesaCard from '../../components/MesaCard';
import EstadoPantalla from '../../components/EstadoPantalla';

export default function InicioScreen() {
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const solicitud = useRef(0);
  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarActivas();
    if (id === solicitud.current) setEstado({ ...resultado, cargando: false });
  }, []);
  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  const reservar = (mesa) => router.push({ pathname: '/reservar/[mesaId]', params: { mesaId: mesa.id } });
  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;
  return (
    <FlatList style={styles.pantalla} contentContainerStyle={styles.lista} data={estado.data}
      keyExtractor={(mesa) => mesa.id} refreshing={estado.cargando} onRefresh={cargar}
      ListHeaderComponent={<View style={styles.encabezado}>
        <Text accessibilityRole="header" style={styles.marca}>Konys Pizza</Text>
        <View style={styles.horario}>
          <Text style={styles.subtitulo}>Horario de atención</Text>
          <Text style={styles.detalle}>12:30 a 2:30 p. m. · 5:00 a 11:00 p. m.</Text>
          <Text style={styles.detalle}>Cra. 36 con calle 41, Bucaramanga</Text>
          <Text style={styles.detalle}>Consulta las jornadas disponibles al reservar.</Text>
        </View>
        <Boton titulo="Reservar mesa" disabled={!estado.data?.length} onPress={() => reservar(estado.data[0])} />
        <Text accessibilityRole="header" style={styles.subtitulo}>Mesas disponibles</Text>
      </View>}
      ListEmptyComponent={<EstadoPantalla mensaje="No hay mesas disponibles" />}
      renderItem={({ item }) => <MesaCard mesa={item} onPress={() => reservar(item)} />} />
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  lista: { padding: 16, paddingBottom: 32 },
  encabezado: { gap: 16, marginBottom: 16 },
  marca: { fontSize: 28, fontWeight: '800', color: colors.primario },
  horario: { padding: 16, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, backgroundColor: colors.blanco, gap: 8 },
  subtitulo: { fontSize: 18, fontWeight: '700', color: colors.texto },
  detalle: { fontSize: 14, color: colors.secundario },
});
