// RF-12 (mockup 08): reservas de la sede gestionada con filtros por día y mesa. Las acciones
// dependen del rol: cancelar exige `reservas.gestionar`; completar, `reservas.completar` o
// `reservas.gestionar` (el mesero completa y no cancela, D-05). RN-06: no se borran.
// F3 (08b, D-06): con `reservas.gestionar` el "+" abre el formulario de reserva en el local.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { listarTodas } from '../../services/mesas';
import { cambiarEstado, listarReservas } from '../../services/reservas';
import { fechaLocal } from '../../services/slots';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';
import FilaReserva from '../../components/FilaReserva';

const FILTROS = { hoy: 'Hoy', manana: 'Mañana', todas: 'Todas' };

function sumarDia(dias) {
  const ahora = new Date();
  return fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias));
}

export default function ReservasScreen() {
  const { sedeGestion, puede } = useSesionPersonal();
  const sedeId = sedeGestion?.id;
  const cancela = puede('reservas.gestionar');
  const completa = puede('reservas.completar', 'reservas.gestionar');
  const navigation = useNavigation();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [mesas, setMesas] = useState([]);
  const [filtro, setFiltro] = useState('hoy');
  const [mesaId, setMesaId] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);
  const solicitud = useRef(0);
  const montada = useRef(true);

  useEffect(() => {
    if (sedeGestion) navigation.setOptions({ title: `Reservas · ${sedeGestion.nombre}` });
  }, [navigation, sedeGestion]);

  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const parametros = filtro === 'hoy' ? { fecha: fechaLocal() }
      : filtro === 'manana' ? { fecha: sumarDia(1), manana: true } : {};
    const resultado = await listarReservas({ ...parametros, sedeId, mesaId });
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, [filtro, mesaId, sedeId]);

  // Las mesas solo sirven para el filtro; un rol sin acceso a mesas ve la lista sin ese filtro.
  useFocusEffect(useCallback(() => {
    montada.current = true;
    if (sedeId) listarTodas(sedeId).then((r) => { if (montada.current) setMesas(r.data ?? []); });
    return () => { montada.current = false; };
  }, [sedeId]));

  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  const guardia = useGuardiaPersonal(['reservas.ver', 'reservas.gestionar']);
  if (guardia) return guardia;

  async function transicionar(reserva, nuevo) {
    setProcesandoId(reserva.id);
    const resultado = await cambiarEstado(reserva.id, nuevo);
    setProcesandoId(null);
    if (montada.current) { if (resultado.error) Alert.alert('No se pudo actualizar', resultado.error); else await cargar(); }
  }

  const chip = (elegido) => [styles.chip, elegido && styles.chipElegido];
  const chipTexto = (elegido) => [styles.chipTexto, elegido && styles.chipTextoElegido];

  return <View style={styles.pantalla}>
    <View style={styles.filtros}>
      {Object.entries(FILTROS).map(([valor, etiqueta]) => <Pressable key={valor} accessibilityRole="button"
        accessibilityState={{ selected: filtro === valor }} onPress={() => setFiltro(valor)} style={chip(filtro === valor)}>
        <Text style={chipTexto(filtro === valor)}>{etiqueta}</Text>
      </Pressable>)}
    </View>
    {!!mesas.length && <ScrollView horizontal style={styles.filtrosMesaContenedor} contentContainerStyle={styles.filtrosMesa} showsHorizontalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: !mesaId }} onPress={() => setMesaId(null)} style={chip(!mesaId)}>
        <Text style={chipTexto(!mesaId)}>Todas las mesas</Text>
      </Pressable>
      {mesas.map((m) => <Pressable key={m.id} accessibilityRole="button" accessibilityState={{ selected: mesaId === m.id }}
        onPress={() => setMesaId(m.id)} style={chip(mesaId === m.id)}>
        <Text style={chipTexto(mesaId === m.id)}>{m.nombre}</Text>
      </Pressable>)}
    </ScrollView>}
    {estado.cargando ? <EstadoPantalla cargando />
      : estado.error ? <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />
        : <FlatList data={estado.data ?? []} keyExtractor={(r) => r.id} contentContainerStyle={styles.lista}
          onRefresh={cargar} refreshing={estado.cargando}
          ListEmptyComponent={<EstadoPantalla mensaje="No hay reservas para este filtro." />}
          renderItem={({ item }) => <FilaReserva reserva={item} procesando={procesandoId === item.id}
            onCancelar={cancela ? () => transicionar(item, 'cancelada') : null}
            onCompletar={completa ? () => transicionar(item, 'completada') : null} />} />}
    {cancela && <Pressable accessibilityRole="button" accessibilityLabel="Registrar reserva en el local"
      onPress={() => router.push('/gestion/reserva-form')} style={styles.fab}>
      <Ionicons name="add" size={32} color={colors.blanco} />
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  lista: { padding: 16, paddingBottom: 100 },
  filtros: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  filtrosMesaContenedor: { flexGrow: 0 },
  filtrosMesa: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 14 },
  chipTextoElegido: { color: colors.blanco },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
});
