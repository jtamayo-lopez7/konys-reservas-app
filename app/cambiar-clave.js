// F3 (mockup 05e, D-07): cambio obligatorio de la clave temporal antes de llegar al panel.
// La base tampoco da acceso a datos mientras perfiles.debe_cambiar_clave sea verdadero.
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { evaluarIngreso } from '../services/permisos';
import { validarClaveNueva } from '../services/validaciones';
import { useSesionPersonal } from '../hooks/SesionPersonal';
import Boton from '../components/Boton';
import Campo from '../components/Campo';
import EstadoPantalla from '../components/EstadoPantalla';

export default function CambiarClaveScreen() {
  const { cargando, perfil, cambiarClave, salir } = useSesionPersonal();
  const [form, setForm] = useState({ nueva: '', confirmar: '' });
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const bloqueo = useRef(false);

  if (cargando && !enviando) return <EstadoPantalla cargando />;
  const evaluacion = evaluarIngreso(perfil);
  if (evaluacion.error) return <Redirect href="/acceso" />;
  if (evaluacion.destino !== '/cambiar-clave' && !enviando) return <Redirect href={evaluacion.destino} />;

  const validacion = validarClaveNueva(form);
  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  async function guardar() {
    if (bloqueo.current || !validacion.valido) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    const resultado = await cambiarClave(form.nueva);
    bloqueo.current = false;
    setEnviando(false);
    // Con éxito, el perfil ya no pide cambio y el Redirect de arriba lleva al panel.
    if (resultado.error) setAviso(resultado.error);
  }

  async function cerrar() {
    await salir();
    router.replace('/bienvenida');
  }

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <View style={styles.cabecera}>
        <Ionicons name="key-outline" size={44} color={colors.texto} />
        <Text accessibilityRole="header" style={styles.titulo}>Crea tu clave personal</Text>
        <Text style={styles.secundario}>Ingresaste con una clave temporal. Antes de continuar crea una clave nueva.</Text>
      </View>
      {!!aviso && <Text accessibilityRole="alert" style={styles.aviso}>{aviso}</Text>}
      <Campo etiqueta="Nueva clave" value={form.nueva} onChangeText={(v) => cambiar('nueva', v)}
        secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" editable={!enviando}
        error={form.nueva ? validacion.errores.nueva : null} ayuda="Mínimo 8 caracteres." />
      <Campo etiqueta="Confirmar clave" value={form.confirmar} onChangeText={(v) => cambiar('confirmar', v)}
        secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" editable={!enviando}
        onSubmitEditing={guardar} error={form.confirmar ? validacion.errores.confirmar : null} />
      <View style={styles.boton}>
        <Boton titulo="Guardar y continuar" cargando={enviando} disabled={!validacion.valido} onPress={guardar} />
      </View>
      <Pressable accessibilityRole="button" onPress={cerrar} disabled={enviando} style={styles.salir} hitSlop={6}>
        <Text style={styles.salirTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { flexGrow: 1, padding: 16, gap: 14 },
  cabecera: { alignItems: 'center', gap: 10, paddingTop: 24, paddingBottom: 6 },
  titulo: { fontSize: 24, fontWeight: '800', color: colors.texto, textAlign: 'center' },
  secundario: { fontSize: 15, color: colors.secundario, textAlign: 'center', lineHeight: 21 },
  aviso: { color: colors.error, fontSize: 14, textAlign: 'center' },
  boton: { alignSelf: 'stretch' },
  salir: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  salirTexto: { color: colors.primario, fontSize: 15, fontWeight: '600' },
});
