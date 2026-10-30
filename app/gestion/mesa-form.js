import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors } from '../../constants/colors';
import { ZONAS } from '../../constants/dominio';
import { crear, obtener, actualizar } from '../../services/mesas';
import { validarMesa } from '../../services/validaciones';
import Boton from '../../components/Boton';
import EstadoPantalla from '../../components/EstadoPantalla';

const formularioInicial = { nombre: '', zona: 'salon', capacidad: '4', foto_url: '' };

export default function MesaFormScreen() {
  const { mesaId } = useLocalSearchParams();
  const esEdicion = Boolean(mesaId);
  const [base, setBase] = useState({ cargando: esEdicion, error: null, mesa: null });
  const [form, setForm] = useState(formularioInicial);
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const bloqueo = useRef(false);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    if (!esEdicion) return setBase({ cargando: false, error: null, mesa: null });
    setBase({ cargando: true, error: null, mesa: null });
    const resultado = await obtener(mesaId);
    if (!montada.current) return;
    if (resultado.error) return setBase({ cargando: false, error: resultado.error, mesa: null });
    if (!resultado.data) return setBase({ cargando: false, error: 'La mesa ya no existe.', mesa: null });
    setForm({
      nombre: resultado.data.nombre, zona: resultado.data.zona,
      capacidad: String(resultado.data.capacidad), foto_url: resultado.data.foto_url ?? '',
    });
    setBase({ cargando: false, error: null, mesa: resultado.data });
  }, [mesaId, esEdicion]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; };
  }, [cargar]));

  const validacion = validarMesa(form);
  const cambiar = (campo, valor) => setForm((anterior) => ({ ...anterior, [campo]: valor }));

  async function guardar() {
    setTocado(true);
    if (bloqueo.current || !validacion.valido) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const datos = { nombre: form.nombre.trim(), zona: form.zona, capacidad: form.capacidad, foto_url: form.foto_url.trim() || null };
      const resultado = esEdicion ? await actualizar(mesaId, datos) : await crear(datos);
      if (!montada.current) return;
      if (resultado.error) setAviso(resultado.error);
      else router.back();
    } finally {
      bloqueo.current = false;
      if (montada.current) setEnviando(false);
    }
  }

  if (base.cargando) return <EstadoPantalla cargando />;
  if (base.error) return <EstadoPantalla mensaje={base.error} onReintentar={cargar} />;

  // Devuelve null (no false) para no dejar un booleano como hijo de <View>.
  const mostrarError = (campo) => (tocado || form[campo]) && validacion.errores[campo]
    ? <Text style={styles.error}>{validacion.errores[campo]}</Text> : null;

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      {aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>Nombre</Text>
        <TextInput accessibilityLabel="Nombre de la mesa" value={form.nombre} onChangeText={(v) => cambiar('nombre', v)}
          autoCapitalize="words" editable={!enviando} style={styles.input} />
        {mostrarError('nombre')}
      </View>
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>Zona</Text>
        <View style={styles.chips}>
          {Object.entries(ZONAS).map(([valor, etiqueta]) => <Pressable key={valor} accessibilityRole="button"
            accessibilityState={{ selected: form.zona === valor }} disabled={enviando}
            onPress={() => cambiar('zona', valor)} style={[styles.chip, form.zona === valor && styles.chipElegido]}>
            <Text style={[styles.chipTexto, form.zona === valor && styles.chipTextoElegido]}>{etiqueta}</Text>
          </Pressable>)}
        </View>
        {mostrarError('zona')}
      </View>
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>Capacidad (1 a 20 personas)</Text>
        <TextInput accessibilityLabel="Capacidad" value={form.capacidad} onChangeText={(v) => cambiar('capacidad', v)}
          keyboardType="number-pad" editable={!enviando} style={styles.input} />
        {mostrarError('capacidad')}
      </View>
      <View style={styles.grupo}>
        <Text style={styles.etiqueta}>URL de la foto (opcional)</Text>
        <TextInput accessibilityLabel="URL de la foto" value={form.foto_url} onChangeText={(v) => cambiar('foto_url', v)}
          autoCapitalize="none" autoComplete="url" editable={!enviando} style={styles.input} placeholder="https://…" placeholderTextColor={colors.secundario} />
      </View>
      <Boton titulo={esEdicion ? 'Guardar cambios' : 'Crear mesa'} cargando={enviando}
        disabled={tocado && !validacion.valido} onPress={guardar} />
      {esEdicion && <Text style={styles.aviso}>Una mesa con reservas no se puede borrar; solo inactivarla.</Text>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { padding: 16, paddingBottom: 40, gap: 18 },
  grupo: { gap: 6 },
  etiqueta: { fontSize: 14, color: colors.secundario },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borde, backgroundColor: colors.blanco, borderRadius: 10, padding: 12, fontSize: 16, color: colors.texto },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 15 },
  chipTextoElegido: { color: colors.blanco },
  error: { color: colors.error, fontSize: 14 },
  aviso: { color: colors.secundario, fontSize: 13, textAlign: 'center' },
});
