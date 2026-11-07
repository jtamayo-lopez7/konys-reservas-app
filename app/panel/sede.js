// F3 (mockups 05c y 05d): panel de la sede con una tarjeta por sección permitida. Reemplaza la
// barra segmentada Mesas/Horarios/Reservas de la antigua pestaña Admin.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { esAdminGeneral, primerNombre, tarjetasPanel } from '../../services/permisos';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EncabezadoPersonal from '../../components/EncabezadoPersonal';
import TarjetaPanel from '../../components/TarjetaPanel';

export default function PanelSedeScreen() {
  const { perfil, sedeGestion, salir } = useSesionPersonal();
  const [saliendo, setSaliendo] = useState(false);

  const guardia = useGuardiaPersonal();
  if (guardia) return guardia;

  const general = esAdminGeneral(perfil);
  const tarjetas = tarjetasPanel(perfil);

  async function cerrarSesion() {
    setSaliendo(true);
    await salir();
    router.replace('/bienvenida');
  }

  return <SafeAreaView style={styles.pantalla} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.contenido}>
      <EncabezadoPersonal nombre={primerNombre(perfil)}
        detalle={`${perfil.rol.nombre} · ${sedeGestion.nombre}${sedeGestion.activa === false ? ' (inactiva)' : ''}`}
        onSalir={cerrarSesion} saliendo={saliendo} />
      {/* Solo el admin general cambia de sede; los demás gestionan la de su perfil. */}
      {general && <Pressable accessibilityRole="button" accessibilityLabel="Cambiar la sede que se gestiona"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/panel'))} style={styles.cambiar} hitSlop={6}>
        <Ionicons name="swap-horizontal-outline" size={18} color={colors.primario} />
        <Text style={styles.cambiarTexto}>Cambiar sede</Text>
      </Pressable>}
      <View style={styles.lista}>
        {tarjetas.map((t) => <TarjetaPanel key={t.clave} titulo={t.titulo} detalle={t.detalle} icono={t.icono}
          onPress={() => router.push(t.ruta)} />)}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { flexGrow: 1, padding: 16, gap: 12 },
  cambiar: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 44 },
  cambiarTexto: { color: colors.primario, fontSize: 15, fontWeight: '600' },
  lista: { gap: 12 },
});
