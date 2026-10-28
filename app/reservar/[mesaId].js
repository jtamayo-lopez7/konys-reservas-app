import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { JORNADAS, ZONAS } from '../../constants/dominio';
import { obtenerActiva } from '../../services/mesas';
import { listar } from '../../services/horarios';
import { crear, slotsOcupados } from '../../services/reservas';
import { generarFechas, generarSlots, leerFecha } from '../../services/slots';
import { validarReserva } from '../../services/validaciones';
import { useReservaConfirmada } from '../../hooks/ReservaConfirmada';
import Boton from '../../components/Boton';
import EstadoPantalla from '../../components/EstadoPantalla';
import SelectorFecha from '../../components/SelectorFecha';
import SlotButton from '../../components/SlotButton';

const formularioInicial = { cliente_nombre: '', num_personas: '1', cliente_contacto: '', acepta_tratamiento_datos: false };

export default function ReservarScreen() {
  const { mesaId } = useLocalSearchParams();
  const { setReserva } = useReservaConfirmada();
  const [base, setBase] = useState({ mesa: null, horarios: [], cargando: true, error: null });
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
    const id = ++solicitudBase.current;
    setBase({ mesa: null, horarios: [], cargando: true, error: null });
    setHora(null);
    const [mesa, horarios] = await Promise.all([obtenerActiva(mesaId), listar()]);
    if (id !== solicitudBase.current) return;
    const error = mesa.error || horarios.error;
    setBase({ mesa: mesa.data, horarios: horarios.data ?? [], cargando: false, error });
    if (!error && mesa.data) {
      const instante = new Date();
      const fechas = generarFechas(horarios.data, instante);
      setAhora(instante);
      setFecha((anterior) => fechas.some((f) => f.fecha === anterior && f.habilitada)
        ? anterior : fechas.find((f) => f.habilitada)?.fecha ?? null);
      setRecarga((n) => n + 1);
    }
  }, [mesaId]);

  useFocusEffect(useCallback(() => {
    cargarBase();
    return () => { solicitudBase.current += 1; };
  }, [cargarBase]));

  useEffect(() => {
    if (!fecha) return;
    let vigente = true;
    slotsOcupados(mesaId, fecha).then((resultado) => {
      if (vigente) setDisponibilidad({ clave: claveDisponibilidad, ...resultado });
    });
    return () => { vigente = false; };
  }, [mesaId, fecha, claveDisponibilidad]);

  const fechas = generarFechas(base.horarios, ahora);
  const fechaHabilitada = fechas.some((f) => f.fecha === fecha && f.habilitada);
  const disponibilidadVigente = disponibilidad.clave === claveDisponibilidad;
  const listaLista = disponibilidadVigente && !disponibilidad.error;
  const slots = fecha && listaLista ? generarSlots(fecha, base.horarios, disponibilidad.data ?? [], ahora) : [];
  const elegido = slots.find((s) => s.hora_inicio === hora && s.disponible);
  const validacion = validarReserva(form, base.mesa?.capacidad ?? 0);
  const cambiar = (campo, valor) => setForm((anterior) => ({ ...anterior, [campo]: valor }));

  async function confirmar() {
    if (bloqueo.current || !validacion.valido || !elegido || !fechaHabilitada) return;
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
        setReserva(resultado.data);
        // La confirmación reemplaza toda la pila para impedir volver al formulario enviado.
        router.dismissAll();
        router.replace('/confirmacion');
      }
    } finally {
      bloqueo.current = false;
      if (montada.current) setEnviando(false);
    }
  }

  if (base.cargando) return <EstadoPantalla cargando />;
  if (base.error) return <EstadoPantalla mensaje={base.error} onReintentar={cargarBase} />;
  if (!base.mesa) return <EstadoPantalla mensaje="La mesa ya no está disponible." onReintentar={cargarBase} />;

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>{base.mesa.nombre}</Text>
        <Text style={styles.secundario}>{ZONAS[base.mesa.zona]} · hasta {base.mesa.capacidad} personas</Text>
      </View>
      {aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
      <Text accessibilityRole="header" style={styles.titulo}>Fecha</Text>
      <SelectorFecha fechas={fechas} seleccionada={fecha} disabled={enviando} onChange={(valor) => { setFecha(valor); setHora(null); setAviso(null); }} />
      {!fechaHabilitada ? <EstadoPantalla mensaje="No hay horarios futuros para esta fecha. Elige otro día habilitado." onReintentar={cargarBase} />
        : !listaLista ? <EstadoPantalla cargando={!disponibilidadVigente}
          mensaje={disponibilidad.error} onReintentar={disponibilidadVigente && disponibilidad.error ? () => setRecarga((n) => n + 1) : undefined} />
        : <>
          {Object.entries(JORNADAS).map(([jornada, etiqueta]) => <View key={jornada} style={styles.grupo}>
            <Text style={styles.titulo}>{etiqueta}</Text>
            <View style={styles.grilla}>{slots.filter((s) => s.jornada === jornada).map((slot) =>
              <SlotButton key={slot.hora_inicio} slot={slot} seleccionado={elegido?.hora_inicio === slot.hora_inicio}
                disabled={enviando} onPress={() => { setHora(slot.hora_inicio); setAviso(null); }} />)}</View>
            {!slots.some((s) => s.jornada === jornada) && <Text style={styles.secundario}>Sin jornada habilitada.</Text>}
          </View>)}
          <View style={styles.leyenda}>
            <Text style={styles.secundario}>□ Libre</Text>
            <Text style={styles.secundario}>▨ Ocupado o pasado</Text>
            <Text style={styles.secundario}>■ Seleccionado</Text>
          </View>
          {!slots.some((s) => s.disponible) && <Text style={styles.secundario}>No quedan horarios disponibles. Elige otra fecha.</Text>}
          {hora && !elegido && <Text accessibilityRole="alert" style={styles.error}>Ese horario ya no está disponible. Elige otro.</Text>}
        </>}
      <Text accessibilityRole="header" style={styles.titulo}>Tus datos</Text>
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>Nombre</Text>
        <TextInput accessibilityLabel="Nombre" value={form.cliente_nombre} onChangeText={(v) => cambiar('cliente_nombre', v)}
          autoCapitalize="words" autoComplete="name" editable={!enviando} style={styles.input} />
        {!!form.cliente_nombre && validacion.errores.cliente_nombre && <Text style={styles.error}>{validacion.errores.cliente_nombre}</Text>}
      </View>
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>Personas (máximo {base.mesa.capacidad})</Text>
        <TextInput accessibilityLabel={`Personas, máximo ${base.mesa.capacidad}`} value={form.num_personas}
          onChangeText={(v) => cambiar('num_personas', v)} keyboardType="number-pad" editable={!enviando} style={styles.input} />
        {validacion.errores.num_personas && <Text style={styles.error}>{validacion.errores.num_personas}</Text>}
      </View>
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>Teléfono (opcional)</Text>
        <TextInput accessibilityLabel="Teléfono opcional" value={form.cliente_contacto} onChangeText={(v) => cambiar('cliente_contacto', v)}
          keyboardType="phone-pad" autoComplete="tel" editable={!enviando} style={styles.input} />
        {validacion.errores.cliente_contacto && <Text style={styles.error}>{validacion.errores.cliente_contacto}</Text>}
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.acepta_tratamiento_datos, disabled: enviando }}
        disabled={enviando} onPress={() => cambiar('acepta_tratamiento_datos', !form.acepta_tratamiento_datos)} style={styles.consentimiento}>
        <Ionicons name={form.acepta_tratamiento_datos ? 'checkbox' : 'square-outline'} size={26} color={colors.primario} />
        <Text style={styles.autorizacion}>Autorizo el tratamiento de mis datos personales por Konys Pizza para gestionar esta reserva (Ley 1581 de 2012).</Text>
      </Pressable>
      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Resumen</Text>
        <Text style={styles.secundario}>{base.mesa.nombre} · {ZONAS[base.mesa.zona]}</Text>
        {fecha && <Text style={styles.secundario}>{leerFecha(fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>}
        <Text style={styles.secundario}>{elegido ? `${elegido.hora_inicio} a ${elegido.hora_fin}` : 'Selecciona un horario disponible'}</Text>
        <Text style={styles.secundario}>{form.num_personas || '—'} personas · {form.cliente_nombre.trim() || 'Indica tu nombre'}</Text>
      </View>
      {!form.acepta_tratamiento_datos && <Text style={styles.secundario}>{validacion.errores.acepta_tratamiento_datos}</Text>}
      <Boton titulo="Confirmar reserva" cargando={enviando}
        disabled={!validacion.valido || !elegido || !fechaHabilitada || !listaLista} onPress={confirmar} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { padding: 16, paddingBottom: 40, gap: 18 },
  tarjeta: { backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, padding: 16, gap: 7 },
  titulo: { fontSize: 18, fontWeight: '700', color: colors.texto },
  secundario: { color: colors.secundario, fontSize: 14, lineHeight: 21 },
  grupo: { gap: 8 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  etiqueta: { fontSize: 14, color: colors.secundario },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borde, backgroundColor: colors.blanco, borderRadius: 10, padding: 12, fontSize: 16, color: colors.texto },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 },
  consentimiento: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  autorizacion: { flex: 1, color: colors.texto, fontSize: 14, lineHeight: 21 },
});
