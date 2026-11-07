// F3 (mockup 08b, D-06): reserva registrada en el local por el personal con `reservas.gestionar`.
// Mismas reglas que la reserva del cliente (RN-01 a RN-05 y RN-09) y sin "Ya pagué": el pago es
// opcional y su casilla llega en F4 con la columna pago_reportado.
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { JORNADAS } from '../../constants/dominio';
import { listarActivas } from '../../services/mesas';
import { listar } from '../../services/horarios';
import { crear, slotsOcupados } from '../../services/reservas';
import { generarFechas, generarSlots, leerFecha } from '../../services/slots';
import { validarReserva } from '../../services/validaciones';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import Boton from '../../components/Boton';
import Campo from '../../components/Campo';
import EstadoPantalla from '../../components/EstadoPantalla';
import SelectorFecha from '../../components/SelectorFecha';
import SlotButton from '../../components/SlotButton';

const formularioInicial = { cliente_nombre: '', num_personas: '1', cliente_contacto: '', acepta_tratamiento_datos: false };

export default function ReservaFormScreen() {
  const { sedeGestion } = useSesionPersonal();
  const sedeId = sedeGestion?.id;
  const [base, setBase] = useState({ mesas: [], horarios: [], cargando: true, error: null });
  const [mesaId, setMesaId] = useState(null);
  const [fecha, setFecha] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState({ clave: null, data: [], error: null });
  const [hora, setHora] = useState(null);
  const [form, setForm] = useState(formularioInicial);
  const [ahora, setAhora] = useState(new Date());
  const [recarga, setRecarga] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const bloqueo = useRef(false);
  const solicitudBase = useRef(0);
  const montada = useRef(true);
  const claveDisponibilidad = `${mesaId}|${fecha}|${recarga}`;

  useEffect(() => {
    montada.current = true;
    const reloj = setInterval(() => setAhora(new Date()), 15000);
    return () => { montada.current = false; clearInterval(reloj); };
  }, []);

  const cargarBase = useCallback(async () => {
    if (!sedeId) return;
    const id = ++solicitudBase.current;
    setBase({ mesas: [], horarios: [], cargando: true, error: null });
    setHora(null);
    const [mesas, horarios] = await Promise.all([listarActivas(sedeId), listar(sedeId)]);
    if (id !== solicitudBase.current) return;
    const error = mesas.error || horarios.error;
    const listaMesas = mesas.data ?? [];
    const listaHorarios = horarios.data ?? [];
    const instante = new Date();
    setAhora(instante);
    setBase({ mesas: listaMesas, horarios: listaHorarios, cargando: false, error });
    if (error) return;
    setMesaId((anterior) => (listaMesas.some((m) => m.id === anterior) ? anterior : listaMesas[0]?.id ?? null));
    const fechas = generarFechas(listaHorarios, instante);
    setFecha((anterior) => (fechas.some((f) => f.fecha === anterior && f.habilitada)
      ? anterior : fechas.find((f) => f.habilitada)?.fecha ?? null));
    setRecarga((n) => n + 1);
  }, [sedeId]);

  useFocusEffect(useCallback(() => {
    cargarBase();
    return () => { solicitudBase.current += 1; };
  }, [cargarBase]));

  useEffect(() => {
    if (!mesaId || !fecha) return;
    let vigente = true;
    slotsOcupados(mesaId, fecha).then((resultado) => {
      if (vigente) setDisponibilidad({ clave: claveDisponibilidad, ...resultado });
    });
    return () => { vigente = false; };
  }, [mesaId, fecha, claveDisponibilidad]);

  const mesa = base.mesas.find((m) => m.id === mesaId) ?? null;
  const fechas = generarFechas(base.horarios, ahora);
  const fechaHabilitada = fechas.some((f) => f.fecha === fecha && f.habilitada);
  const disponibilidadVigente = disponibilidad.clave === claveDisponibilidad;
  const listaLista = disponibilidadVigente && !disponibilidad.error;
  const slots = fecha && listaLista ? generarSlots(fecha, base.horarios, disponibilidad.data ?? [], ahora) : [];
  const elegido = slots.find((s) => s.hora_inicio === hora && s.disponible);
  const validacion = validarReserva(form, mesa?.capacidad ?? 0);
  const cambiar = (campo, valor) => setForm((anterior) => ({ ...anterior, [campo]: valor }));

  function elegirMesa(id) {
    setMesaId(id);
    setHora(null);
    setAviso(null);
    setForm((f) => ({ ...f, num_personas: '1' }));
  }

  async function registrar() {
    if (bloqueo.current || !validacion.valido || !elegido || !fechaHabilitada || !mesa) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const resultado = await crear(mesaId, fecha, elegido.hora_inicio, form);
      if (!montada.current) return;
      if (resultado.error) {
        setAviso(resultado.error);
        setHora(null);
        await cargarBase();
      } else {
        // Vuelve a la lista; useFocusEffect la recarga con la reserva nueva.
        router.back();
      }
    } finally {
      bloqueo.current = false;
      if (montada.current) setEnviando(false);
    }
  }

  const guardia = useGuardiaPersonal(['reservas.gestionar']);
  if (guardia) return guardia;
  if (base.cargando) return <EstadoPantalla cargando />;
  if (base.error) return <EstadoPantalla mensaje={base.error} onReintentar={cargarBase} />;
  if (!base.mesas.length) {
    return <EstadoPantalla mensaje="Esta sede no tiene mesas activas. Actívalas en Mesas antes de registrar una reserva." onReintentar={cargarBase} />;
  }

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      {!!aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
      <Text style={styles.seccion}>Mesa</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {base.mesas.map((m) => <Pressable key={m.id} accessibilityRole="button" accessibilityState={{ selected: mesaId === m.id }}
          onPress={() => elegirMesa(m.id)} style={[styles.chip, mesaId === m.id && styles.chipElegido]}>
          <Text style={[styles.chipTexto, mesaId === m.id && styles.chipTextoElegido]}>{m.nombre}</Text>
        </Pressable>)}
      </ScrollView>
      <Text style={styles.seccion}>Fecha</Text>
      <SelectorFecha fechas={fechas} seleccionada={fecha} disabled={enviando}
        onChange={(valor) => { setFecha(valor); setHora(null); setAviso(null); }} />
      {!fechaHabilitada
        ? <EstadoPantalla mensaje="No hay horarios futuros para esta fecha. Elige otro día habilitado." onReintentar={cargarBase} />
        : !listaLista
          ? <EstadoPantalla cargando={!disponibilidadVigente}
            mensaje={disponibilidad.error}
            onReintentar={disponibilidadVigente && disponibilidad.error ? () => setRecarga((n) => n + 1) : undefined} />
          : <>
            {Object.entries(JORNADAS).map(([jornada, etiqueta]) => <View key={jornada} style={styles.grupo}>
              <Text style={styles.seccion}>{etiqueta}</Text>
              <View style={styles.grilla}>{slots.filter((s) => s.jornada === jornada).map((slot) =>
                <SlotButton key={slot.hora_inicio} slot={slot} seleccionado={elegido?.hora_inicio === slot.hora_inicio}
                  disabled={enviando} onPress={() => { setHora(slot.hora_inicio); setAviso(null); }} />)}</View>
              {!slots.some((s) => s.jornada === jornada) && <Text style={styles.secundario}>Sin jornada habilitada.</Text>}
            </View>)}
            {hora && !elegido && <Text accessibilityRole="alert" style={styles.error}>Ese horario ya no está disponible. Elige otro.</Text>}
          </>}
      <Text style={styles.seccion}>Datos del cliente</Text>
      <Campo etiqueta="Nombre del cliente" value={form.cliente_nombre} onChangeText={(v) => cambiar('cliente_nombre', v)}
        editable={!enviando} autoCapitalize="words" error={form.cliente_nombre ? validacion.errores.cliente_nombre : null} />
      <Campo etiqueta={`Personas (máximo ${mesa?.capacidad ?? 0})`} value={form.num_personas}
        onChangeText={(v) => cambiar('num_personas', v)} editable={!enviando} keyboardType="number-pad"
        error={validacion.errores.num_personas} />
      <Campo etiqueta="Teléfono (opcional)" value={form.cliente_contacto} onChangeText={(v) => cambiar('cliente_contacto', v)}
        editable={!enviando} keyboardType="phone-pad" error={validacion.errores.cliente_contacto} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.acepta_tratamiento_datos, disabled: enviando }}
        disabled={enviando} onPress={() => cambiar('acepta_tratamiento_datos', !form.acepta_tratamiento_datos)} style={styles.consentimiento}>
        <Ionicons name={form.acepta_tratamiento_datos ? 'checkbox' : 'square-outline'} size={26} color={colors.primario} />
        <Text style={styles.autorizacion}>El cliente autoriza el tratamiento de sus datos personales para gestionar esta reserva (Ley 1581 de 2012).</Text>
      </Pressable>
      {!form.acepta_tratamiento_datos && <Text style={styles.secundario}>{validacion.errores.acepta_tratamiento_datos}</Text>}
      <View style={styles.tarjeta}>
        <Text style={styles.seccion}>Resumen</Text>
        <Text style={styles.secundario}>{mesa?.nombre ?? 'Selecciona una mesa'} · {form.num_personas || '—'} personas</Text>
        {fecha && <Text style={styles.secundario}>{leerFecha(fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>}
        <Text style={styles.secundario}>{elegido ? `${elegido.hora_inicio} a ${elegido.hora_fin}` : 'Selecciona un horario disponible'}</Text>
      </View>
      <Boton titulo="Registrar reserva" cargando={enviando}
        disabled={!validacion.valido || !elegido || !fechaHabilitada || !listaLista || !mesa} onPress={registrar} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { padding: 16, paddingBottom: 40, gap: 14 },
  seccion: { fontSize: 16, fontWeight: '700', color: colors.texto },
  secundario: { color: colors.secundario, fontSize: 14, lineHeight: 21 },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 14 },
  chipTextoElegido: { color: colors.blanco },
  grupo: { gap: 8 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tarjeta: { backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, padding: 16, gap: 7 },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 },
  consentimiento: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  autorizacion: { flex: 1, color: colors.texto, fontSize: 14, lineHeight: 21 },
});
