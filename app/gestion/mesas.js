// RF-10, RF-13 (mockup 06): mesas de la sede gestionada. Con `mesas.gestionar` se crean, editan,
// activan y borran; con solo `mesas.ver` es una lista de consulta (mesero, recepción).
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { borrar, cambiarEstado, listarTodas } from '../../services/mesas';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';
import FilaMesa from '../../components/FilaMesa';

export default function MesasScreen() {
  const { sedeGestion, puede } = useSesionPersonal();
  const sedeId = sedeGestion?.id;
  const gestiona = puede('mesas.gestionar');
  const navigation = useNavigation();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [procesandoId, setProcesandoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [mesaAEliminar, setMesaAEliminar] = useState(null);
  const solicitud = useRef(0);
  const montada = useRef(true);

  useEffect(() => {
    if (sedeGestion) navigation.setOptions({ title: `Mesas · ${sedeGestion.nombre}` });
  }, [navigation, sedeGestion]);

  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarTodas(sedeId);
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, [sedeId]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  const guardia = useGuardiaPersonal(['mesas.ver', 'mesas.gestionar']);
  if (guardia) return guardia;

  async function alternar(mesa) {
    setProcesandoId(mesa.id);
    setAviso(null);
    const resultado = await cambiarEstado(mesa.id, !mesa.activa);
    setProcesandoId(null);
    if (!montada.current) return;
    if (resultado.error) setAviso(resultado.error); else await cargar();
  }

  // La confirmación es en pantalla (no Alert) para que el borrado dependa solo del estado de la
  // vista y no de un diálogo nativo (CP-20).
  async function borrarMesa(mesa) {
    setMesaAEliminar(null);
    setProcesandoId(mesa.id);
    const resultado = await borrar(mesa.id);
    setProcesandoId(null);
    if (!montada.current) return;
    if (resultado.error) setAviso(resultado.error); else await cargar();
  }

  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;
  return <View style={styles.pantalla}>
    {!!aviso && <Text accessibilityRole="alert" style={styles.aviso}>{aviso}</Text>}
    <FlatList data={estado.data ?? []} keyExtractor={(m) => m.id} contentContainerStyle={styles.lista}
      onRefresh={cargar} refreshing={estado.cargando}
      ListEmptyComponent={<EstadoPantalla mensaje="No hay mesas registradas." />}
      renderItem={({ item }) => <FilaMesa mesa={item} procesando={procesandoId === item.id} soloLectura={!gestiona}
        onCambiarEstado={() => alternar(item)}
        onEditar={() => router.push({ pathname: '/gestion/mesa-form', params: { mesaId: item.id } })}
        onBorrar={() => { setAviso(null); setMesaAEliminar(item); }} />} />
    {gestiona && <Pressable accessibilityRole="button" accessibilityLabel="Crear mesa" onPress={() => router.push('/gestion/mesa-form')}
      style={styles.fab}>
      <Ionicons name="add" size={32} color={colors.blanco} />
    </Pressable>}
    <Modal transparent visible={!!mesaAEliminar} animationType="fade" onRequestClose={() => setMesaAEliminar(null)}>
      <View style={styles.modalFondo}>
        <View style={styles.modalCaja}>
          <Text style={styles.modalTitulo}>Borrar mesa</Text>
          <Text style={styles.modalTexto}>¿Borrar «{mesaAEliminar?.nombre}»? Esta acción no se puede deshacer.</Text>
          <View style={styles.modalAcciones}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar borrado" onPress={() => setMesaAEliminar(null)}
              style={[styles.modalBoton, styles.modalCancelar]}>
              <Text style={styles.modalCancelarTexto}>Cancelar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Confirmar borrado" onPress={() => borrarMesa(mesaAEliminar)}
              style={[styles.modalBoton, styles.modalBorrar]}>
              <Text style={styles.modalBorrarTexto}>Borrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  lista: { padding: 16, paddingBottom: 90 },
  aviso: { color: colors.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 16, paddingTop: 12 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCaja: { width: '100%', maxWidth: 420, backgroundColor: colors.blanco, borderRadius: 16, padding: 20, gap: 12 },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: colors.texto },
  modalTexto: { fontSize: 15, color: colors.texto },
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBoton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  modalCancelar: { backgroundColor: colors.fondo, borderWidth: 1, borderColor: colors.borde },
  modalCancelarTexto: { color: colors.texto, fontSize: 16, fontWeight: '600' },
  modalBorrar: { backgroundColor: colors.error },
  modalBorrarTexto: { color: colors.blanco, fontSize: 16, fontWeight: '600' },
});
