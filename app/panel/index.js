// F3 (mockup 05b): inicio del administrador general. Elige la sede que va a gestionar (incluye
// inactivas) y abre la administración general. Los roles de sede pasan directo a su panel.
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { listarTodas } from '../../services/sedes';
import { esAdminGeneral, primerNombre } from '../../services/permisos';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import Boton from '../../components/Boton';
import EncabezadoPersonal from '../../components/EncabezadoPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';
import TarjetaPanel from '../../components/TarjetaPanel';

export default function PanelGeneralScreen() {
  const { perfil, elegirSede, puede, salir } = useSesionPersonal();
  const general = esAdminGeneral(perfil);
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [saliendo, setSaliendo] = useState(false);
  const solicitud = useRef(0);

  const cargar = useCallback(async () => {
    if (!general) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarTodas();
    if (id === solicitud.current) setEstado({ ...resultado, cargando: false });
  }, [general]);

  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  const guardia = useGuardiaPersonal([], { conSede: false });
  if (guardia) return guardia;
  if (!general) return <Redirect href="/panel/sede" />;

  function abrir(sede) {
    elegirSede(sede);
    router.push('/panel/sede');
  }

  async function cerrarSesion() {
    setSaliendo(true);
    await salir();
    router.replace('/bienvenida');
  }

  let sedes;
  if (estado.cargando) sedes = <EstadoPantalla cargando />;
  else if (estado.error) sedes = <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;
  else if (!estado.data?.length) sedes = <Text style={styles.secundario}>No hay sedes registradas. Crea la primera en Gestionar sedes.</Text>;
  else {
    sedes = estado.data.map((s) => <TarjetaPanel key={s.id} titulo={s.nombre}
      etiqueta={s.activa ? null : 'Inactiva'}
      detalle={`${s.direccion || 'Dirección por definir'}${s.es_principal ? ' · principal' : ''}`}
      onPress={() => abrir(s)} />);
  }

  return <SafeAreaView style={styles.pantalla} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.contenido}>
      <EncabezadoPersonal nombre={primerNombre(perfil)} detalle={`${perfil.rol.nombre} · todas las sedes`}
        onSalir={cerrarSesion} saliendo={saliendo} />
      <Text style={styles.seccion}>Elige la sede que vas a gestionar</Text>
      <View style={styles.lista}>{sedes}</View>
      <Text style={styles.seccion}>Administración general</Text>
      {puede('sedes.gestionar') && <Boton titulo="Gestionar sedes" variante="secundario" onPress={() => router.push('/gestion/sedes')} />}
      {puede('roles.gestionar') && <Boton titulo="Roles y permisos" variante="secundario" onPress={() => router.push('/gestion/roles')} />}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { flexGrow: 1, padding: 16, gap: 12 },
  seccion: { fontSize: 16, fontWeight: '500', color: colors.texto, marginTop: 8 },
  lista: { gap: 12, minHeight: 72 },
  secundario: { fontSize: 15, color: colors.secundario },
});
