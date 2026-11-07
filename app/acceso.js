// RF-08 ampliado en F3 (mockup 05a): acceso de personal con correo y clave, desde la rueda de
// ajustes de la bienvenida. Con sesión abierta salta directo a su destino (05b, 05c o 05e).
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { evaluarIngreso } from '../services/permisos';
import { validarAcceso } from '../services/validaciones';
import { useSesionPersonal } from '../hooks/SesionPersonal';
import Boton from '../components/Boton';
import Campo from '../components/Campo';
import EstadoPantalla from '../components/EstadoPantalla';
import Footer from '../components/Footer';

export default function AccesoScreen() {
  const { cargando, perfil, ingresar } = useSesionPersonal();
  const [form, setForm] = useState({ correo: '', clave: '' });
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const bloqueo = useRef(false);

  if (cargando && !enviando) return <EstadoPantalla cargando />;
  // Sesión vigente y válida: no se vuelve a pedir la clave.
  const vigente = perfil && evaluarIngreso(perfil).destino;
  if (vigente && !enviando) return <Redirect href={vigente} />;

  const validacion = validarAcceso(form);
  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  async function enviar() {
    setTocado(true);
    if (bloqueo.current || !validacion.valido) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    const resultado = await ingresar(form.correo, form.clave);
    bloqueo.current = false;
    setEnviando(false);
    // Con éxito, el perfil queda en el contexto y el Redirect de arriba lleva a su destino.
    if (resultado.error) {
      setAviso(resultado.error);
      setForm((f) => ({ ...f, clave: '' }));
    }
  }

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <View style={styles.cabecera}>
        <Ionicons name="lock-closed-outline" size={44} color={colors.texto} />
        <Text accessibilityRole="header" style={styles.titulo}>Acceso de personal</Text>
        <Text style={styles.secundario}>Ingresa con el correo y la clave que te asignaron. Entrarás a tu sede con los permisos de tu rol.</Text>
      </View>
      {!!aviso && <Text accessibilityRole="alert" style={styles.aviso}>{aviso}</Text>}
      <Campo etiqueta="Correo" value={form.correo} onChangeText={(v) => cambiar('correo', v)}
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username"
        editable={!enviando} error={tocado ? validacion.errores.correo : null} />
      <Campo etiqueta="Clave" value={form.clave} onChangeText={(v) => cambiar('clave', v)}
        secureTextEntry autoCapitalize="none" autoComplete="password" textContentType="password"
        editable={!enviando} onSubmitEditing={enviar} error={tocado ? validacion.errores.clave : null} />
      <View style={styles.boton}><Boton titulo="Ingresar" cargando={enviando} onPress={enviar} /></View>
      <View style={styles.pie}><Footer /></View>
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
  pie: { marginTop: 'auto', paddingTop: 24 },
});
