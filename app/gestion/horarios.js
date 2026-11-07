// RF-11 (mockups 07 y 07b): jornadas de la sede gestionada, 7 días x 2 jornadas con edición en
// línea. Requiere `horarios.gestionar`.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { colors } from '../../constants/colors';
import { DIAS_ORDEN, JORNADAS } from '../../constants/dominio';
import { actualizar, listarTodos } from '../../services/horarios';
import { validarHorario } from '../../services/validaciones';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';
import FilaHorario from '../../components/FilaHorario';

export default function HorariosScreen() {
  const { sedeGestion } = useSesionPersonal();
  const sedeId = sedeGestion?.id;
  const navigation = useNavigation();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [editando, setEditando] = useState(null); // id de la jornada en edición
  const [borrador, setBorrador] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const solicitud = useRef(0);
  const montada = useRef(true);

  useEffect(() => {
    if (sedeGestion) navigation.setOptions({ title: `Horarios · ${sedeGestion.nombre}` });
  }, [navigation, sedeGestion]);

  const cargar = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarTodos(sedeId);
    if (id === solicitud.current && montada.current) { setEstado({ ...resultado, cargando: false }); setEditando(null); }
  }, [sedeId]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  const guardia = useGuardiaPersonal(['horarios.gestionar']);
  if (guardia) return guardia;

  const validacion = borrador ? validarHorario(borrador) : null;

  function abrirEdicion(horario) {
    setEditando(horario.id);
    setBorrador({ ...horario, hora_inicio: horario.hora_inicio.slice(0, 5), hora_fin: horario.hora_fin.slice(0, 5), duracion_slot: String(horario.duracion_slot) });
  }

  async function guardar(horario) {
    if (!validacion.valido) return;
    setProcesando(true);
    const datos = { hora_inicio: borrador.hora_inicio, hora_fin: borrador.hora_fin, duracion_slot: Number(borrador.duracion_slot) };
    const resultado = await actualizar(horario.id, datos);
    setProcesando(false);
    if (montada.current) { if (resultado.error) Alert.alert('No se pudo guardar', resultado.error); else await cargar(); }
  }

  async function alternarActivo(horario, activo) {
    setProcesando(true);
    const resultado = await actualizar(horario.id, { activo });
    setProcesando(false);
    if (montada.current) { if (resultado.error) Alert.alert('No se pudo cambiar el estado', resultado.error); else await cargar(); }
  }

  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;
  const porClave = new Map((estado.data ?? []).map((h) => [`${h.dia_semana}|${h.jornada}`, h]));
  const filas = [];
  DIAS_ORDEN.forEach((dia) => Object.keys(JORNADAS).forEach((jornada) => {
    const horario = porClave.get(`${dia}|${jornada}`);
    const enEdicion = !!horario && editando === horario.id;
    filas.push(<FilaHorario key={`${dia}-${jornada}`} dia={dia} jornada={jornada} horario={horario}
      borrador={enEdicion ? borrador : null} editando={enEdicion} procesando={procesando}
      errores={enEdicion ? validacion?.errores ?? {} : {}}
      onEditar={() => abrirEdicion(horario)} onGuardar={() => guardar(horario)} onCancelar={() => setEditando(null)}
      onCambio={(cambios) => { if (cambios.activo !== undefined) alternarActivo(horario, cambios.activo); else setBorrador((b) => ({ ...b, ...cambios })); }} />);
  }));
  return <ScrollView style={styles.pantalla} contentContainerStyle={styles.lista}>{filas}</ScrollView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  lista: { padding: 16, paddingBottom: 40 },
});
