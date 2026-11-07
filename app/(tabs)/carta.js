// RF-07: carta de la sede elegida por categorías (RF-16, RN-10; mockup 04).
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { CATEGORIAS } from '../../constants/dominio';
import { listar } from '../../services/platos';
import { useSede } from '../../hooks/SedeSeleccionada';
import BotonCambiarSede from '../../components/BotonCambiarSede';
import EstadoPantalla from '../../components/EstadoPantalla';
import PlatoItem from '../../components/PlatoItem';

export default function CartaScreen() {
  const { sede } = useSede();
  const sedeId = sede?.id;
  const [categoria, setCategoria] = useState(Object.keys(CATEGORIAS)[0]);
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const solicitud = useRef(0);
  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listar(sedeId);
    if (id === solicitud.current) setEstado({ ...resultado, cargando: false });
  }, [sedeId]);
  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  if (!sede) return <Redirect href="/bienvenida" />;

  return <SafeAreaView style={styles.pantalla} edges={['top']}>
    <View style={styles.cabecera}>
      <Text accessibilityRole="header" style={styles.titulo}>Carta</Text>
      {/* En la carta el botón muestra el nombre de la sede (mockup 04). */}
      <BotonCambiarSede titulo={sede.nombre} onPress={() => router.replace('/bienvenida')} />
    </View>
    <View><ScrollView horizontal contentContainerStyle={styles.categorias} showsHorizontalScrollIndicator={false}>
      {Object.entries(CATEGORIAS).map(([valor, etiqueta]) => <Pressable key={valor} onPress={() => setCategoria(valor)}
        accessibilityRole="button" accessibilityState={{ selected: categoria === valor }}
        style={[styles.chip, categoria === valor && styles.elegido]}>
        <Text style={[styles.texto, categoria === valor && styles.claro]}>{etiqueta}</Text>
      </Pressable>)}
    </ScrollView></View>
    {estado.cargando ? <EstadoPantalla cargando /> : estado.error ? <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />
      : <FlatList data={(estado.data ?? []).filter((p) => p.categoria === categoria)}
        keyExtractor={(p) => p.id} contentContainerStyle={styles.lista} onRefresh={cargar} refreshing={estado.cargando}
        ListEmptyComponent={<EstadoPantalla mensaje="No hay platos disponibles en esta categoría." />}
        renderItem={({ item }) => <PlatoItem plato={item} />} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  titulo: { fontSize: 26, fontWeight: '800', color: colors.primario },
  categorias: { padding: 16, gap: 8 },
  chip: { minHeight: 44, borderRadius: 24, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  elegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  texto: { color: colors.texto, fontSize: 15 },
  claro: { color: colors.blanco },
  lista: { padding: 16, paddingTop: 0, flexGrow: 1 },
});
