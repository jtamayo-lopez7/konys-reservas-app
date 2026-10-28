import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../constants/colors';
import { CATEGORIAS } from '../../constants/dominio';
import { listar } from '../../services/platos';
import EstadoPantalla from '../../components/EstadoPantalla';
import PlatoItem from '../../components/PlatoItem';

export default function CartaScreen() {
  const [categoria, setCategoria] = useState(Object.keys(CATEGORIAS)[0]);
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const solicitud = useRef(0);
  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listar();
    if (id === solicitud.current) setEstado({ ...resultado, cargando: false });
  }, []);
  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  return <View style={styles.pantalla}>
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
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  categorias: { padding: 16, gap: 8 },
  chip: { minHeight: 44, borderRadius: 24, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  elegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  texto: { color: colors.texto, fontSize: 15 },
  claro: { color: colors.blanco },
  lista: { padding: 16, paddingTop: 0, flexGrow: 1 },
});
