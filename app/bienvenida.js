// RF-15: bienvenida en cada arranque y selección de sede (mockups 00, 00b y 00c).
// La rueda de ajustes lleva al acceso de personal (05a, F3).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { entradaDirecta, listarActivas } from '../services/sedes';
import { useSede } from '../hooks/SedeSeleccionada';
import Boton from '../components/Boton';
import Footer from '../components/Footer';

// Vive mientras la app está abierta: la entrada directa solo ocurre en el arranque.
let arranqueAtendido = false;
const ESPERA_ENTRADA_MS = 1200;

export default function BienvenidaScreen() {
  const { seleccionar } = useSede();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const solicitud = useRef(0);

  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarActivas();
    if (id === solicitud.current) setEstado({ data: resultado.data ?? [], error: resultado.error, cargando: false });
  }, []);

  // Recarga al volver a la pantalla (por ejemplo, desde "Cambiar sede").
  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  // RF-16: la sede elegida queda en el contexto; Inicio, Carta y Reservar filtran por ella.
  const entrar = useCallback((sede) => {
    arranqueAtendido = true;
    seleccionar(sede);
    router.replace('/inicio');
  }, [seleccionar]);

  const directa = !estado.cargando && !estado.error && entradaDirecta(estado.data, !arranqueAtendido);
  useEffect(() => {
    if (!directa) return undefined;
    const temporizador = setTimeout(() => entrar(estado.data[0]), ESPERA_ENTRADA_MS);
    return () => clearTimeout(temporizador);
  }, [directa, entrar, estado.data]);

  let contenido;
  if (estado.cargando || directa) {
    contenido = <View style={styles.estado}>
      <ActivityIndicator size="large" color={colors.primario} />
      {directa && <Text style={styles.secundario}>Entrando a {estado.data[0].nombre}…</Text>}
    </View>;
  } else if (estado.error) {
    contenido = <View style={styles.estado}>
      <Ionicons name="warning-outline" size={36} color={colors.secundario} />
      <Text accessibilityRole="alert" style={styles.mensaje}>{estado.error}</Text>
      <Boton titulo="Reintentar" variante="secundario" onPress={cargar} />
    </View>;
  } else if (!estado.data.length) {
    contenido = <View style={styles.estado}>
      <Ionicons name="storefront-outline" size={36} color={colors.secundario} />
      <Text style={styles.mensaje}>Por ahora no hay sedes disponibles para reservar. Vuelve a intentarlo más tarde.</Text>
      <Boton titulo="Actualizar" variante="secundario" onPress={cargar} />
    </View>;
  } else {
    contenido = <View style={styles.lista}>
      <Text style={styles.secundario}>Elige la sede donde quieres reservar</Text>
      {estado.data.map((sede) => <Boton key={sede.id} titulo={sede.nombre} variante="secundario" onPress={() => entrar(sede)} />)}
    </View>;
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.cabecera}>
          <Text style={styles.saludo}>Bienvenidos a</Text>
          <Text accessibilityRole="header" style={styles.marca}>Konys Pizza</Text>
          {/* Marcador del logo: se reemplaza cuando el restaurante entregue el archivo. */}
          <View style={styles.logo} accessibilityLabel="Logo de Konys Pizza">
            <Text style={styles.logoTexto}>K</Text>
          </View>
        </View>
        {contenido}
        <View style={styles.pie}>
          <Pressable accessibilityRole="button" accessibilityLabel="Acceso de personal" hitSlop={8}
            onPress={() => router.push('/acceso')} style={({ pressed }) => [styles.ajustes, pressed && styles.presionado]}>
            <Ionicons name="settings-outline" size={24} color={colors.primario} />
          </Pressable>
          <Footer />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { flexGrow: 1, padding: 16, gap: 24 },
  cabecera: { alignItems: 'center', paddingTop: 48, gap: 4 },
  saludo: { fontSize: 17, color: colors.secundario, fontWeight: '500' },
  marca: { fontSize: 26, fontWeight: '800', color: colors.primario },
  logo: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.ocupado, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  logoTexto: { fontSize: 44, fontWeight: '800', color: colors.texto },
  lista: { gap: 12 },
  estado: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  secundario: { fontSize: 15, color: colors.secundario, textAlign: 'center' },
  mensaje: { fontSize: 15, color: colors.texto, textAlign: 'center' },
  pie: { marginTop: 'auto', gap: 12 },
  ajustes: { alignSelf: 'flex-end', width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, alignItems: 'center', justifyContent: 'center' },
  presionado: { opacity: 0.7 },
});
