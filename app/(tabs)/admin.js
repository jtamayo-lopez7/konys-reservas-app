// RF-08: acceso del administrador con Supabase Auth.
// RF-10, RF-11, RF-12, RF-13: panel de gestión de mesas, horarios y reservas.
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { DIAS_ORDEN, JORNADAS } from '../../constants/dominio';
import { useSesionAdmin } from '../../hooks/useSesionAdmin';
import { borrar, cambiarEstado as cambiarEstadoMesa, listarTodas } from '../../services/mesas';
import { actualizar as actualizarHorario, listarTodos as listarHorarios } from '../../services/horarios';
import { cambiarEstado as cambiarEstadoReserva, listarReservas } from '../../services/reservas';
import { fechaLocal } from '../../services/slots';
import { validarHorario } from '../../services/validaciones';
import Boton from '../../components/Boton';
import EstadoPantalla from '../../components/EstadoPantalla';
import FilaHorario from '../../components/FilaHorario';
import FilaMesa from '../../components/FilaMesa';
import FilaReserva from '../../components/FilaReserva';

const SECCIONES = { mesas: 'Mesas', horarios: 'Horarios', reservas: 'Reservas' };
const FILTROS = { hoy: 'Hoy', manana: 'Mañana', todas: 'Todas' };

function sumarDia(dias) {
  const ahora = new Date();
  return fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias));
}

export default function AdminScreen() {
  const { cargando: cargandoSesion, activa, error: errorSesion, entrar, salir } = useSesionAdmin();
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [seccion, setSeccion] = useState('mesas');

  async function ingresar() {
    if (enviando || !clave) return;
    setEnviando(true);
    await entrar(clave);
    setEnviando(false);
    setClave('');
  }

  if (cargandoSesion) return <EstadoPantalla cargando />;
  if (!activa) {
    return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.acceso} keyboardShouldPersistTaps="handled">
        <Ionicons name="lock-closed-outline" size={56} color={colors.primario} />
        <Text accessibilityRole="header" style={styles.titulo}>Administración</Text>
        <Text style={styles.secundario}>Ingresa la clave del administrador.</Text>
        {!!errorSesion && <Text accessibilityRole="alert" style={styles.error}>{errorSesion}</Text>}
        <TextInput accessibilityLabel="Clave del administrador" value={clave} onChangeText={setClave}
          secureTextEntry autoCapitalize="none" editable={!enviando} style={styles.input} placeholder="Clave" placeholderTextColor={colors.secundario} />
        <Boton titulo="Ingresar" cargando={enviando} disabled={!clave} onPress={ingresar} />
      </ScrollView>
    </KeyboardAvoidingView>;
  }
  return <Panel seccion={seccion} setSeccion={setSeccion} onSalir={salir} />;
}

function Panel({ seccion, setSeccion, onSalir }) {
  return <View style={styles.pantalla}>
    <View style={styles.barra}>
      <View style={styles.segmentos}>
        {Object.entries(SECCIONES).map(([valor, etiqueta]) => <Pressable key={valor} accessibilityRole="button"
          accessibilityState={{ selected: seccion === valor }} onPress={() => setSeccion(valor)}
          style={[styles.segmento, seccion === valor && styles.segmentoElegido]}>
          <Text style={[styles.segmentoTexto, seccion === valor && styles.segmentoTextoElegido]}>{etiqueta}</Text>
        </Pressable>)}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" onPress={onSalir}
        style={styles.salir} hitSlop={8}>
        <Ionicons name="log-out-outline" size={24} color={colors.primario} />
      </Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Gestionar carta" onPress={() => router.push('/gestion/carta')}
      style={styles.accesoCarta}>
      <Ionicons name="restaurant-outline" size={18} color={colors.primario} />
      <Text style={styles.accesoCartaTexto}>Gestionar carta</Text>
    </Pressable>
    {seccion === 'mesas' ? <MesasPanel /> : seccion === 'horarios' ? <HorariosPanel /> : <ReservasPanel />}
  </View>;
}

function MesasPanel() {
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [procesandoId, setProcesandoId] = useState(null);
  const solicitud = useRef(0);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarTodas();
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, []);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  async function alternar(mesa) {
    setProcesandoId(mesa.id);
    const resultado = await cambiarEstadoMesa(mesa.id, !mesa.activa);
    setProcesandoId(null);
    if (montada.current) { if (resultado.error) Alert.alert('No se pudo cambiar el estado', resultado.error); else await cargar(); }
  }

  function confirmarBorrado(mesa) {
    Alert.alert('Borrar mesa', `¿Borrar «${mesa.nombre}»? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => borrarMesa(mesa) },
    ]);
  }

  async function borrarMesa(mesa) {
    setProcesandoId(mesa.id);
    const resultado = await borrar(mesa.id);
    setProcesandoId(null);
    if (montada.current) { if (resultado.error) Alert.alert('No se pudo borrar', resultado.error); else await cargar(); }
  }

  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;
  return <View style={styles.contenido}>
    <FlatList data={estado.data ?? []} keyExtractor={(m) => m.id} contentContainerStyle={styles.lista}
      onRefresh={cargar} refreshing={estado.cargando}
      ListEmptyComponent={<EstadoPantalla mensaje="No hay mesas registradas." />}
      renderItem={({ item }) => <FilaMesa mesa={item} procesando={procesandoId === item.id}
        onCambiarEstado={() => alternar(item)} onEditar={() => router.push({ pathname: '/gestion/mesa-form', params: { mesaId: item.id } })}
        onBorrar={() => confirmarBorrado(item)} />} />
    <Pressable accessibilityRole="button" accessibilityLabel="Crear mesa" onPress={() => router.push('/gestion/mesa-form')}
      style={styles.fab}>
      <Ionicons name="add" size={32} color={colors.blanco} />
    </Pressable>
  </View>;
}

function HorariosPanel() {
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [editando, setEditando] = useState(null); // id de la jornada en edición
  const [borrador, setBorrador] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const solicitud = useRef(0);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarHorarios();
    if (id === solicitud.current && montada.current) { setEstado({ ...resultado, cargando: false }); setEditando(null); }
  }, []);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  const validacion = borrador ? validarHorario(borrador) : null;

  function abrirEdicion(horario) {
    setEditando(horario.id);
    setBorrador({ ...horario, hora_inicio: horario.hora_inicio.slice(0, 5), hora_fin: horario.hora_fin.slice(0, 5), duracion_slot: String(horario.duracion_slot) });
  }

  async function guardar(horario) {
    if (!validacion.valido) return;
    setProcesando(true);
    const datos = { hora_inicio: borrador.hora_inicio, hora_fin: borrador.hora_fin, duracion_slot: Number(borrador.duracion_slot) };
    const resultado = await actualizarHorario(horario.id, datos);
    setProcesando(false);
    if (montada.current) { if (resultado.error) Alert.alert('No se pudo guardar', resultado.error); else await cargar(); }
  }

  async function alternarActivo(horario, activo) {
    setProcesando(true);
    const resultado = await actualizarHorario(horario.id, { activo });
    setProcesando(false);
    if (montada.current) { if (resultado.error) Alert.alert('No se pudo cambiar el estado', resultado.error); else await cargar(); }
  }

  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;
  const porId = new Map((estado.data ?? []).map((h) => [`${h.dia_semana}|${h.jornada}`, h]));
  const filas = [];
  DIAS_ORDEN.forEach((dia) => Object.keys(JORNADAS).forEach((jornada) => {
    const horario = porId.get(`${dia}|${jornada}`);
    filas.push(<FilaHorario key={`${dia}-${jornada}`} dia={dia} jornada={jornada} horario={horario}
      borrador={editando === horario?.id ? borrador : null}
      editando={editando === horario?.id} procesando={procesando} errores={editando === horario?.id ? validacion?.errores ?? {} : {}}
      onEditar={() => abrirEdicion(horario)} onGuardar={() => guardar(horario)} onCancelar={() => setEditando(null)}
      onCambio={(cambios) => { if (cambios.activo !== undefined) alternarActivo(horario, cambios.activo); else setBorrador((b) => ({ ...b, ...cambios })); }} />);
  }));
  return <ScrollView contentContainerStyle={styles.lista}>{filas}</ScrollView>;
}

function ReservasPanel() {
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [mesas, setMesas] = useState([]);
  const [filtro, setFiltro] = useState('hoy');
  const [mesaId, setMesaId] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);
  const solicitud = useRef(0);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const parametros = filtro === 'hoy' ? { fecha: fechaLocal() }
      : filtro === 'manana' ? { fecha: sumarDia(1), manana: true } : {};
    const resultado = await listarReservas({ ...parametros, mesaId });
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, [filtro, mesaId]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    listarTodas().then((r) => { if (montada.current) setMesas(r.data ?? []); });
    return () => { montada.current = false; };
  }, []));

  useFocusEffect(useCallback(() => {
    cargar();
    return () => { solicitud.current += 1; };
  }, [cargar]));

  async function transicionar(reserva, estado) {
    setProcesandoId(reserva.id);
    const resultado = await cambiarEstadoReserva(reserva.id, estado);
    setProcesandoId(null);
    if (montada.current) { if (resultado.error) Alert.alert('No se pudo actualizar', resultado.error); else await cargar(); }
  }

  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;
  return <View style={styles.contenido}>
    <View style={styles.filtros}>
      {Object.entries(FILTROS).map(([valor, etiqueta]) => <Pressable key={valor} accessibilityRole="button"
        accessibilityState={{ selected: filtro === valor }} onPress={() => setFiltro(valor)}
        style={[styles.chip, filtro === valor && styles.chipElegido]}>
        <Text style={[styles.chipTexto, filtro === valor && styles.chipTextoElegido]}>{etiqueta}</Text>
      </Pressable>)}
    </View>
    <ScrollView horizontal contentContainerStyle={styles.filtrosMesa} showsHorizontalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: !mesaId }} onPress={() => setMesaId(null)}
        style={[styles.chip, !mesaId && styles.chipElegido]}>
        <Text style={[styles.chipTexto, !mesaId && styles.chipTextoElegido]}>Todas las mesas</Text>
      </Pressable>
      {mesas.map((m) => <Pressable key={m.id} accessibilityRole="button" accessibilityState={{ selected: mesaId === m.id }}
        onPress={() => setMesaId(m.id)} style={[styles.chip, mesaId === m.id && styles.chipElegido]}>
        <Text style={[styles.chipTexto, mesaId === m.id && styles.chipTextoElegido]}>{m.nombre}</Text>
      </Pressable>)}
    </ScrollView>
    <FlatList data={estado.data ?? []} keyExtractor={(r) => r.id} contentContainerStyle={styles.lista}
      onRefresh={cargar} refreshing={estado.cargando}
      ListEmptyComponent={<EstadoPantalla mensaje="No hay reservas para este filtro." />}
      renderItem={({ item }) => <FilaReserva reserva={item} procesando={procesandoId === item.id}
        onCancelar={() => transicionar(item, 'cancelada')} onCompletar={() => transicionar(item, 'completada')} />} />
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  acceso: { flexGrow: 1, padding: 24, gap: 14, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 26, fontWeight: '800', color: colors.primario },
  secundario: { color: colors.secundario, fontSize: 15, textAlign: 'center' },
  input: { alignSelf: 'stretch', minHeight: 48, borderWidth: 1, borderColor: colors.borde, backgroundColor: colors.blanco, borderRadius: 10, padding: 12, fontSize: 16, color: colors.texto },
  error: { color: colors.error, fontSize: 14, textAlign: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.blanco, borderBottomWidth: 1, borderBottomColor: colors.borde },
  segmentos: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: colors.fondo, borderRadius: 12, padding: 4 },
  segmento: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentoElegido: { backgroundColor: colors.primario },
  segmentoTexto: { color: colors.texto, fontSize: 14, fontWeight: '600' },
  segmentoTextoElegido: { color: colors.blanco },
  salir: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  accesoCarta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: colors.blanco, borderBottomWidth: 1, borderBottomColor: colors.borde },
  accesoCartaTexto: { color: colors.primario, fontWeight: '600', fontSize: 14 },
  contenido: { flex: 1 },
  lista: { padding: 16, paddingBottom: 90 },
  filtros: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  filtrosMesa: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 14 },
  chipTextoElegido: { color: colors.blanco },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
});
