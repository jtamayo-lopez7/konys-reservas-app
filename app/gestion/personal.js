// F3C (mockups 14 y 14c, D-04): personal de la sede gestionada. Requiere `usuarios.gestionar`.
// - El interruptor suspende o reactiva el acceso (perfiles.activo).
// - La papelera borra la cuenta con la Edge Function `eliminar-usuario`.
// - El admin de sede solo lo gestiona el admin general, y nadie se gestiona a sí mismo.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { cambiarActivo, eliminar, listar } from '../../services/personal';
import { puedeGestionarPerfil } from '../../services/permisos';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';

export default function PersonalScreen() {
  const { perfil, sedeGestion } = useSesionPersonal();
  const sedeId = sedeGestion?.id;
  const navigation = useNavigation();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [filtro, setFiltro] = useState(null); // código de rol o null = todos
  const [procesandoId, setProcesandoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const solicitud = useRef(0);
  const montada = useRef(true);

  useEffect(() => {
    if (sedeGestion) navigation.setOptions({ title: `Personal · ${sedeGestion.nombre}` });
  }, [navigation, sedeGestion]);

  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listar(sedeId);
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, [sedeId]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  // Filtros solo con los roles que hay en la sede (14: Todos, Admin. sede, Meseros…).
  const rolesPresentes = useMemo(() => {
    const vistos = new Map();
    (estado.data ?? []).forEach((p) => { if (p.rol) vistos.set(p.rol.codigo, p.rol.nombre); });
    return [...vistos.entries()];
  }, [estado.data]);

  const guardia = useGuardiaPersonal(['usuarios.gestionar']);
  if (guardia) return guardia;

  async function alternar(usuario) {
    setProcesandoId(usuario.id);
    setAviso(null);
    const resultado = await cambiarActivo(usuario.id, !usuario.activo);
    if (!montada.current) return;
    setProcesandoId(null);
    if (resultado.error) setAviso(resultado.error); else await cargar();
  }

  async function confirmarEliminar(usuario) {
    setAEliminar(null);
    setProcesandoId(usuario.id);
    setAviso(null);
    const resultado = await eliminar(usuario.id);
    if (!montada.current) return;
    setProcesandoId(null);
    if (resultado.error) setAviso(resultado.error); else await cargar();
  }

  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;
  const lista = (estado.data ?? []).filter((p) => !filtro || p.rol?.codigo === filtro);
  const chip = (elegido) => [styles.chip, elegido && styles.chipElegido];
  const chipTexto = (elegido) => [styles.chipTexto, elegido && styles.chipTextoElegido];

  return <View style={styles.pantalla}>
    {rolesPresentes.length > 1 && <ScrollView horizontal style={styles.filtrosContenedor} contentContainerStyle={styles.filtros} showsHorizontalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: !filtro }} onPress={() => setFiltro(null)} style={chip(!filtro)}>
        <Text style={chipTexto(!filtro)}>Todos</Text>
      </Pressable>
      {rolesPresentes.map(([codigo, nombre]) => <Pressable key={codigo} accessibilityRole="button" accessibilityState={{ selected: filtro === codigo }}
        onPress={() => setFiltro(codigo)} style={chip(filtro === codigo)}>
        <Text style={chipTexto(filtro === codigo)}>{nombre}</Text>
      </Pressable>)}
    </ScrollView>}
    {!!aviso && <Text accessibilityRole="alert" style={styles.aviso}>{aviso}</Text>}
    <FlatList data={lista} keyExtractor={(p) => p.id} contentContainerStyle={styles.lista}
      onRefresh={cargar} refreshing={estado.cargando}
      ListEmptyComponent={<EstadoPantalla mensaje="Esta sede aún no tiene personal registrado." />}
      renderItem={({ item }) => {
        const gestionable = puedeGestionarPerfil(perfil, item);
        const procesando = procesandoId === item.id;
        const estadoTexto = !item.activo ? ' · suspendido' : item.debe_cambiar_clave ? ' · clave temporal' : '';
        return <View style={styles.fila}>
          <View style={styles.contenido}>
            <Text style={styles.correo} numberOfLines={1}>{item.email}</Text>
            <Text style={styles.detalle}>{item.nombre} · {item.rol?.nombre ?? 'Sin rol'}{estadoTexto}{item.id === perfil.id ? ' · tú' : ''}</Text>
          </View>
          {gestionable && <>
            <Switch accessibilityLabel={`Acceso de ${item.email}`} value={item.activo} disabled={procesando}
              onValueChange={() => alternar(item)} trackColor={{ true: colors.primario, false: colors.ocupado }} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.email}`} disabled={procesando}
              onPress={() => router.push({ pathname: '/gestion/usuario-form', params: { usuarioId: item.id } })} style={styles.accion} hitSlop={8}>
              <Ionicons name="pencil-outline" size={22} color={colors.primario} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${item.email}`} disabled={procesando}
              onPress={() => { setAviso(null); setAEliminar(item); }} style={styles.accion} hitSlop={8}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </Pressable>
          </>}
        </View>;
      }} />
    <Pressable accessibilityRole="button" accessibilityLabel="Nuevo usuario" onPress={() => router.push('/gestion/usuario-form')} style={styles.fab}>
      <Ionicons name="add" size={32} color={colors.blanco} />
    </Pressable>
    <Modal transparent visible={!!aEliminar} animationType="fade" onRequestClose={() => setAEliminar(null)}>
      <View style={styles.modalFondo}>
        <View style={styles.modalCaja}>
          <Text style={styles.modalTitulo}>¿Eliminar a {aEliminar?.email}?</Text>
          <Text style={styles.modalTexto}>Se borra su cuenta y ya no podrá ingresar. Las reservas que gestionó se conservan. Si solo quieres suspender el acceso, usa el interruptor.</Text>
          <View style={styles.modalAcciones}>
            <Pressable accessibilityRole="button" onPress={() => setAEliminar(null)} style={[styles.modalBoton, styles.modalCancelar]}>
              <Text style={styles.modalCancelarTexto}>Cancelar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => confirmarEliminar(aEliminar)} style={[styles.modalBoton, styles.modalBorrar]}>
              <Text style={styles.modalBorrarTexto}>Eliminar cuenta</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  filtrosContenedor: { flexGrow: 0 },
  filtros: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 14 },
  chipTextoElegido: { color: colors.blanco },
  aviso: { color: colors.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 16, paddingTop: 12 },
  lista: { padding: 16, paddingBottom: 90, gap: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  contenido: { flex: 1, gap: 3 },
  correo: { fontSize: 16, fontWeight: '600', color: colors.texto },
  detalle: { fontSize: 13, color: colors.secundario },
  accion: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCaja: { width: '100%', maxWidth: 420, backgroundColor: colors.blanco, borderRadius: 16, padding: 20, gap: 12 },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: colors.texto },
  modalTexto: { fontSize: 15, color: colors.texto, lineHeight: 21 },
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBoton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  modalCancelar: { backgroundColor: colors.fondo, borderWidth: 1, borderColor: colors.borde },
  modalCancelarTexto: { color: colors.texto, fontSize: 16, fontWeight: '600' },
  modalBorrar: { backgroundColor: colors.error },
  modalBorrarTexto: { color: colors.blanco, fontSize: 16, fontWeight: '600' },
});
