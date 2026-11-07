// F3C (mockup 14b, D-04, D-07): nuevo usuario de la sede gestionada, con clave temporal y rol, o
// edición de nombre, rol y acceso. El correo y la sede no cambian después de crear la cuenta.
// Muestra lo que el rol elegido puede hacer, con los textos de la tabla `privilegios`.
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { colors } from '../../constants/colors';
import { actualizar, crear, listar as listarPersonal, obtener } from '../../services/personal';
import { listar as listarRoles } from '../../services/roles';
import { puedeGestionarPerfil, resumenPrivilegios, rolesAsignables } from '../../services/permisos';
import { validarUsuario } from '../../services/validaciones';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import Boton from '../../components/Boton';
import Campo from '../../components/Campo';
import EstadoPantalla from '../../components/EstadoPantalla';

const vacio = { correo: '', nombre: '', clave_temporal: '', rol_id: null, activo: true };

export default function UsuarioFormScreen() {
  const { usuarioId } = useLocalSearchParams();
  const nuevo = !usuarioId;
  const navigation = useNavigation();
  const { perfil, sedeGestion } = useSesionPersonal();
  const sedeId = sedeGestion?.id;
  const [base, setBase] = useState({ cargando: true, error: null, roles: [], personal: [], usuario: null });
  const [form, setForm] = useState(vacio);
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const bloqueo = useRef(false);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    if (!sedeId) return;
    navigation.setOptions({ title: nuevo ? 'Nuevo usuario' : 'Editar usuario' });
    setBase((b) => ({ ...b, cargando: true, error: null }));
    const [roles, personal, usuario] = await Promise.all([
      listarRoles(), listarPersonal(sedeId), nuevo ? Promise.resolve({ data: null, error: null }) : obtener(usuarioId),
    ]);
    if (!montada.current) return;
    const error = roles.error ?? personal.error ?? usuario.error ?? (!nuevo && !usuario.data ? 'La cuenta ya no existe.' : null);
    if (error) return setBase((b) => ({ ...b, cargando: false, error }));
    if (usuario.data) {
      const u = usuario.data;
      setForm({ correo: u.email, nombre: u.nombre, clave_temporal: '', rol_id: u.rol?.id ?? null, activo: u.activo });
    }
    setBase({ cargando: false, error: null, roles: roles.data, personal: personal.data, usuario: usuario.data });
  }, [sedeId, nuevo, usuarioId, navigation]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; };
  }, [cargar]));

  const guardia = useGuardiaPersonal(['usuarios.gestionar']);
  if (guardia) return guardia;
  if (base.cargando) return <EstadoPantalla cargando />;
  if (base.error) return <EstadoPantalla mensaje={base.error} onReintentar={cargar} />;
  if (!nuevo && !puedeGestionarPerfil(perfil, base.usuario)) {
    return <EstadoPantalla mensaje="No puedes modificar esta cuenta." />;
  }

  const opciones = rolesAsignables(perfil, base.roles, base.personal, usuarioId ?? null);
  const elegido = opciones.find((r) => r.id === form.rol_id);
  const validacion = validarUsuario(form, { nuevo });
  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const error = (campo) => (tocado ? validacion.errores[campo] : null);

  async function guardar() {
    setTocado(true);
    if (bloqueo.current || !validacion.valido) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    const resultado = nuevo
      ? await crear({ ...form, sede_id: sedeId })
      : await actualizar(usuarioId, { nombre: form.nombre.trim(), rol_id: form.rol_id, activo: form.activo });
    bloqueo.current = false;
    if (!montada.current) return;
    setEnviando(false);
    if (resultado.error) setAviso(resultado.error); else router.back();
  }

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      {!!aviso && <Text accessibilityRole="alert" style={styles.aviso}>{aviso}</Text>}
      <Campo etiqueta="Correo del usuario" value={form.correo} onChangeText={(v) => cambiar('correo', v)}
        editable={nuevo && !enviando} keyboardType="email-address" autoCapitalize="none" autoComplete="off"
        error={error('correo')} ayuda={nuevo ? null : 'El correo no se puede cambiar.'} />
      <Campo etiqueta="Nombre" value={form.nombre} onChangeText={(v) => cambiar('nombre', v)}
        editable={!enviando} autoCapitalize="words" error={error('nombre')} />
      {nuevo && <Campo etiqueta="Clave temporal" value={form.clave_temporal} onChangeText={(v) => cambiar('clave_temporal', v)}
        editable={!enviando} secureTextEntry autoCapitalize="none" autoComplete="off" textContentType="oneTimeCode"
        error={error('clave_temporal')} ayuda="Mínimo 8 caracteres. Deberá cambiarla en su primer ingreso." />}
      <Text style={styles.seccion}>Sede</Text>
      <Text style={styles.valor}>{sedeGestion.nombre}</Text>
      <Text style={styles.seccion}>Rol</Text>
      <View style={styles.chips}>
        {opciones.map((r) => {
          const activo = form.rol_id === r.id;
          return <Pressable key={r.id} accessibilityRole="button" accessibilityState={{ selected: activo, disabled: !!r.motivo }}
            disabled={!!r.motivo || enviando} onPress={() => cambiar('rol_id', r.id)}
            style={[styles.chip, activo && styles.chipElegido, !!r.motivo && styles.chipDeshabilitado]}>
            <Text style={[styles.chipTexto, activo && styles.chipTextoElegido, !!r.motivo && styles.chipTextoDeshabilitado]}>
              {r.nombre}{r.motivo ? ` · ${r.motivo}` : ''}
            </Text>
          </Pressable>;
        })}
      </View>
      {!!error('rol_id') && <Text style={styles.aviso}>{error('rol_id')}</Text>}
      {!!elegido && <View style={styles.resumen}>
        <Text style={styles.resumenTitulo}>{elegido.nombre} puede</Text>
        <Text style={styles.resumenTexto}>{resumenPrivilegios(elegido) || 'Este rol aún no tiene permisos.'}</Text>
      </View>}
      <View style={styles.interruptor}>
        <Text style={styles.seccion}>Acceso activo</Text>
        <Switch accessibilityLabel="Acceso activo" value={form.activo} disabled={enviando}
          onValueChange={(v) => cambiar('activo', v)} trackColor={{ true: colors.primario, false: colors.ocupado }} />
      </View>
      <Boton titulo="Guardar" cargando={enviando} disabled={tocado && !validacion.valido} onPress={guardar} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { padding: 16, paddingBottom: 40, gap: 12 },
  aviso: { color: colors.error, fontSize: 14 },
  seccion: { fontSize: 16, fontWeight: '500', color: colors.texto },
  valor: { fontSize: 15, color: colors.secundario, marginTop: -6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipDeshabilitado: { borderStyle: 'dashed', backgroundColor: colors.fondo },
  chipTexto: { color: colors.texto, fontSize: 14 },
  chipTextoElegido: { color: colors.blanco },
  chipTextoDeshabilitado: { color: colors.secundario },
  resumen: { padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, gap: 4 },
  resumenTitulo: { fontSize: 15, fontWeight: '600', color: colors.texto },
  resumenTexto: { fontSize: 13, color: colors.secundario, lineHeight: 19 },
  interruptor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
});
