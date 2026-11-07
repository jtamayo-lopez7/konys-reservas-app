// RF-16: nueva sede y editar sede (mockups 13b y 13c). Sin "Eliminar sede": llega en F4 (13d).
// F3C (13b, D-04, D-07): al crear la sede se crea también su único administrador (rol admin_sede)
// con clave temporal, por la Edge Function crear-usuario. Si la sede se creó y el administrador
// no, la pantalla recuerda la sede y al volver a guardar solo reintenta el administrador.
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { colors } from '../../constants/colors';
import { actualizar, crear, obtener } from '../../services/sedes';
import { crear as crearUsuario } from '../../services/personal';
import { listar as listarRoles } from '../../services/roles';
import { validarSede, validarUsuario } from '../../services/validaciones';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import Boton from '../../components/Boton';
import Campo from '../../components/Campo';
import EstadoPantalla from '../../components/EstadoPantalla';

const formularioInicial = { nombre: '', direccion: '', telefono: '', activa: true, admin_correo: '', admin_clave: '' };

// Nombre del perfil del administrador; él puede pedir que se lo cambien después.
const nombreAdmin = (sede) => `Administrador ${sede}`.slice(0, 80);

export default function SedeFormScreen() {
  const { sedeId } = useLocalSearchParams();
  const esEdicion = Boolean(sedeId);
  const navigation = useNavigation();
  // F3: solo con sedes.gestionar (admin general); mantiene al día la sede que se gestiona.
  const { sedeGestion: sedeActual, elegirSede: seleccionar } = useSesionPersonal();
  const [base, setBase] = useState({ cargando: esEdicion, error: null, sede: null });
  const [form, setForm] = useState(formularioInicial);
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [rolAdminId, setRolAdminId] = useState(null);
  const [creada, setCreada] = useState(null); // sede ya creada cuyo administrador falló
  const bloqueo = useRef(false);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    navigation.setOptions({ title: esEdicion ? 'Editar sede' : 'Nueva sede' });
    if (!esEdicion) {
      setBase({ cargando: true, error: null, sede: null });
      const roles = await listarRoles();
      if (!montada.current) return;
      const rol = roles.data?.find((r) => r.codigo === 'admin_sede');
      if (roles.error || !rol) return setBase({ cargando: false, error: roles.error ?? 'No se encontró el rol de administrador de sede.', sede: null });
      setRolAdminId(rol.id);
      return setBase({ cargando: false, error: null, sede: null });
    }
    setBase({ cargando: true, error: null, sede: null });
    const resultado = await obtener(sedeId);
    if (!montada.current) return;
    if (resultado.error) return setBase({ cargando: false, error: resultado.error, sede: null });
    if (!resultado.data) return setBase({ cargando: false, error: 'La sede ya no existe.', sede: null });
    const s = resultado.data;
    setForm({ nombre: s.nombre, direccion: s.direccion ?? '', telefono: s.telefono ?? '', activa: s.activa });
    setBase({ cargando: false, error: null, sede: s });
  }, [sedeId, esEdicion, navigation]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; };
  }, [cargar]));

  const validacionSede = validarSede(form);
  // El administrador solo se pide al crear (13b).
  const validacionAdmin = esEdicion ? { valido: true, errores: {} } : validarUsuario({
    correo: form.admin_correo, nombre: nombreAdmin(form.nombre), clave_temporal: form.admin_clave, rol_id: rolAdminId,
  });
  const validacion = {
    valido: validacionSede.valido && validacionAdmin.valido,
    errores: { ...validacionSede.errores, admin_correo: validacionAdmin.errores.correo, admin_clave: validacionAdmin.errores.clave_temporal },
  };
  const principal = Boolean(base.sede?.es_principal);
  const cambiar = (campo, valor) => setForm((anterior) => ({ ...anterior, [campo]: valor }));

  async function guardar() {
    setTocado(true);
    if (bloqueo.current || !validacion.valido) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const datos = { nombre: form.nombre.trim(), direccion: form.direccion.trim(), telefono: form.telefono.trim() || null };
      // La principal siempre queda activa (D-03); no se envía el campo para no chocar con el trigger.
      if (!principal) datos.activa = form.activa;
      if (esEdicion) {
        const resultado = await actualizar(sedeId, datos);
        if (!montada.current) return;
        if (resultado.error) { setAviso(resultado.error); return; }
        if (sedeActual?.id === resultado.data.id) seleccionar(resultado.data);
        router.back();
        return;
      }
      let sede = creada;
      if (!sede) {
        const resultado = await crear(datos);
        if (!montada.current) return;
        if (resultado.error) { setAviso(resultado.error); return; }
        sede = resultado.data;
        setCreada(sede);
      }
      const admin = await crearUsuario({
        correo: form.admin_correo, nombre: nombreAdmin(sede.nombre), clave_temporal: form.admin_clave,
        rol_id: rolAdminId, sede_id: sede.id, activo: true,
      });
      if (!montada.current) return;
      if (admin.error) {
        setAviso(`La sede «${sede.nombre}» se creó, pero no su administrador: ${admin.error} Corrige los datos y vuelve a guardar.`);
        return;
      }
      router.back();
    } finally {
      bloqueo.current = false;
      if (montada.current) setEnviando(false);
    }
  }

  const guardia = useGuardiaPersonal(['sedes.gestionar'], { conSede: false });
  if (guardia) return guardia;
  if (base.cargando) return <EstadoPantalla cargando />;
  if (base.error) return <EstadoPantalla mensaje={base.error} onReintentar={cargar} />;

  const mostrarError = (campo) => (tocado || form[campo]) && validacion.errores[campo]
    ? <Text style={styles.error}>{validacion.errores[campo]}</Text> : null;

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      {aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>Nombre de la sede</Text>
        <TextInput accessibilityLabel="Nombre de la sede" value={form.nombre} onChangeText={(v) => cambiar('nombre', v)}
          autoCapitalize="words" editable={!enviando && !creada} style={styles.input} />
        {mostrarError('nombre')}
      </View>
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>Dirección</Text>
        <TextInput accessibilityLabel="Dirección" value={form.direccion} onChangeText={(v) => cambiar('direccion', v)}
          editable={!enviando && !creada} style={styles.input} />
        {mostrarError('direccion')}
      </View>
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>Teléfono (opcional)</Text>
        <TextInput accessibilityLabel="Teléfono opcional" value={form.telefono} onChangeText={(v) => cambiar('telefono', v)}
          keyboardType="phone-pad" editable={!enviando && !creada} style={styles.input} />
        {mostrarError('telefono')}
      </View>
      {!esEdicion && <>
        <Text style={styles.seccion}>Administrador de la sede</Text>
        <Campo etiqueta="Correo del administrador" value={form.admin_correo} onChangeText={(v) => cambiar('admin_correo', v)}
          editable={!enviando} keyboardType="email-address" autoCapitalize="none" autoComplete="off"
          error={tocado ? validacion.errores.admin_correo : null} />
        <Campo etiqueta="Clave temporal" value={form.admin_clave} onChangeText={(v) => cambiar('admin_clave', v)}
          editable={!enviando} secureTextEntry autoCapitalize="none" autoComplete="off" textContentType="oneTimeCode"
          error={tocado ? validacion.errores.admin_clave : null} ayuda="Mínimo 8 caracteres. Deberá cambiarla en su primer ingreso." />
      </>}
      {principal
        ? <View style={styles.nota}><Text style={styles.secundario}>Sede principal: siempre está activa y no se puede eliminar.</Text></View>
        : <View style={styles.interruptor}>
          <Text style={styles.texto}>Sede activa</Text>
          <Switch accessibilityLabel="Sede activa" value={form.activa} disabled={enviando || !!creada}
            onValueChange={(v) => cambiar('activa', v)} trackColor={{ true: colors.primario, false: colors.ocupado }} />
        </View>}
      {!esEdicion && <Text style={styles.secundario}>La sede nueva recibe las jornadas de almuerzo y noche de todos los días; ajústalas en Horarios.</Text>}
      <Boton titulo={esEdicion ? 'Guardar cambios' : 'Guardar sede'} cargando={enviando}
        disabled={tocado && !validacion.valido} onPress={guardar} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { padding: 16, paddingBottom: 40, gap: 18 },
  grupo: { gap: 6 },
  etiqueta: { fontSize: 14, color: colors.secundario },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borde, backgroundColor: colors.blanco, borderRadius: 10, padding: 12, fontSize: 16, color: colors.texto },
  interruptor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  texto: { fontSize: 16, color: colors.texto },
  nota: { padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  secundario: { fontSize: 14, color: colors.secundario },
  seccion: { fontSize: 16, fontWeight: '600', color: colors.texto },
  error: { color: colors.error, fontSize: 14 },
});
