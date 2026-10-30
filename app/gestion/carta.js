// RF-14: gestión de la carta (crear, editar, ocultar/mostrar y eliminar platos).
import { useCallback, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { CATEGORIAS } from '../../constants/dominio';
import { listarTodos, crear, actualizar, borrar } from '../../services/platos';
import { validarPlato } from '../../services/validaciones';
import Boton from '../../components/Boton';
import EstadoPantalla from '../../components/EstadoPantalla';

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const vacio = { nombre: '', categoria: 'pizzas', descripcion: '', precio: '', disponible: true, foto_url: '' };

export default function CartaAdminScreen() {
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [form, setForm] = useState(null); // null = lista; objeto = creando o editando
  const [editandoId, setEditandoId] = useState(null);
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);
  const solicitud = useRef(0);
  const bloqueo = useRef(false);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarTodos();
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, []);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  const validacion = form ? validarPlato(form) : null;
  const cambiar = (campo, valor) => setForm((anterior) => ({ ...anterior, [campo]: valor }));

  function abrir(plato = null) {
    setAviso(null);
    setTocado(false);
    setEditandoId(plato?.id ?? null);
    setForm(plato ? { ...vacio, ...plato, precio: String(plato.precio), foto_url: plato.foto_url ?? '' } : { ...vacio });
  }
  function cancelar() { setForm(null); setEditandoId(null); setAviso(null); }

  async function guardar() {
    setTocado(true);
    if (bloqueo.current || !validacion.valido) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const datos = { nombre: form.nombre.trim(), categoria: form.categoria, descripcion: form.descripcion.trim() || null, precio: form.precio, disponible: form.disponible, foto_url: form.foto_url.trim() || null };
      const resultado = editandoId ? await actualizar(editandoId, datos) : await crear(datos);
      if (!montada.current) return;
      if (resultado.error) setAviso(resultado.error);
      else { cancelar(); await cargar(); }
    } finally {
      bloqueo.current = false;
      if (montada.current) setEnviando(false);
    }
  }

  async function alternarDisponible(plato) {
    setProcesandoId(plato.id);
    const resultado = await actualizar(plato.id, { disponible: !plato.disponible });
    if (montada.current) { setProcesandoId(null); if (resultado.error) setAviso(resultado.error); else await cargar(); }
  }

  async function eliminar(plato) {
    setProcesandoId(plato.id);
    const resultado = await borrar(plato.id);
    if (montada.current) { setProcesandoId(null); if (resultado.error) setAviso(resultado.error); else await cargar(); }
  }

  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;

  if (form) {
    const mostrarError = (campo) => (tocado || form[campo]) && validacion.errores[campo]
      ? <Text style={styles.error}>{validacion.errores[campo]}</Text> : null;
    return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formulario}>
          {aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
          <Text style={styles.titulo}>{editandoId ? 'Editar plato' : 'Nuevo plato'}</Text>
          <Text style={styles.etiqueta}>Nombre</Text>
          <TextInput accessibilityLabel="Nombre del plato" value={form.nombre} onChangeText={(v) => cambiar('nombre', v)}
            autoCapitalize="words" editable={!enviando} style={styles.input} />
          {mostrarError('nombre')}
          <Text style={styles.etiqueta}>Categoría</Text>
          <View style={styles.chips}>
            {Object.entries(CATEGORIAS).map(([valor, etiqueta]) => <Pressable key={valor} accessibilityRole="button"
              accessibilityState={{ selected: form.categoria === valor }} disabled={enviando}
              onPress={() => cambiar('categoria', valor)} style={[styles.chip, form.categoria === valor && styles.chipElegido]}>
              <Text style={[styles.chipTexto, form.categoria === valor && styles.chipTextoElegido]}>{etiqueta}</Text>
            </Pressable>)}
          </View>
          {mostrarError('categoria')}
          <Text style={styles.etiqueta}>Descripción (opcional)</Text>
          <TextInput accessibilityLabel="Descripción" value={form.descripcion} onChangeText={(v) => cambiar('descripcion', v)}
            editable={!enviando} multiline style={[styles.input, styles.area]} />
          <Text style={styles.etiqueta}>Precio en pesos (COP)</Text>
          <TextInput accessibilityLabel="Precio" value={form.precio} onChangeText={(v) => cambiar('precio', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad" editable={!enviando} style={styles.input} />
          {mostrarError('precio')}
          <Text style={styles.etiqueta}>URL de la foto (opcional)</Text>
          <TextInput accessibilityLabel="URL de la foto" value={form.foto_url} onChangeText={(v) => cambiar('foto_url', v)}
            autoCapitalize="none" editable={!enviando} style={styles.input} placeholder="https://…" placeholderTextColor={colors.secundario} />
          <View style={styles.disponible}>
            <Text style={styles.etiqueta}>Disponible en la carta del cliente</Text>
            <Switch accessibilityLabel="Disponible" value={form.disponible} disabled={enviando}
              onValueChange={(v) => cambiar('disponible', v)} trackColor={{ true: colors.primario, false: colors.ocupado }} />
          </View>
          <Boton titulo={editandoId ? 'Guardar cambios' : 'Crear plato'} cargando={enviando}
            disabled={tocado && !validacion.valido} onPress={guardar} />
          <Boton titulo="Cancelar" onPress={cancelar} />
      </ScrollView>
    </KeyboardAvoidingView>;
  }

  return <View style={styles.pantalla}>
    {aviso && <Text accessibilityRole="alert" style={[styles.error, styles.avisoTop]}>{aviso}</Text>}
    <FlatList data={estado.data ?? []} keyExtractor={(p) => p.id} contentContainerStyle={styles.lista}
      onRefresh={cargar} refreshing={estado.cargando}
      ListEmptyComponent={<EstadoPantalla mensaje="No hay platos registrados." />}
      ListHeaderComponent={<Boton titulo="Agregar plato" onPress={() => abrir()} />}
      renderItem={({ item }) => <View style={[styles.plato, !item.disponible && styles.oculto]}>
        <View style={styles.platoContenido}>
          <Text style={styles.platoNombre}>{item.nombre}</Text>
          <Text style={styles.detalle}>{CATEGORIAS[item.categoria]} · {pesos.format(item.precio)}</Text>
          {!item.disponible && <Text style={styles.etiqueta}>Oculto para el cliente</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.nombre}`} disabled={procesandoId === item.id}
          onPress={() => abrir(item)} style={styles.accion} hitSlop={8}>
          <Ionicons name="pencil-outline" size={22} color={colors.primario} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.disponible ? 'Ocultar' : 'Mostrar'} ${item.nombre}`}
          disabled={procesandoId === item.id} onPress={() => alternarDisponible(item)} style={styles.accion} hitSlop={8}>
          <Ionicons name={item.disponible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.secundario} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${item.nombre}`} disabled={procesandoId === item.id}
          onPress={() => eliminar(item)} style={styles.accion} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color={colors.error} />
        </Pressable>
      </View>} />
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  lista: { padding: 16, paddingBottom: 40, gap: 10 },
  avisoTop: { paddingHorizontal: 16, paddingTop: 12 },
  formulario: { padding: 16, paddingBottom: 40, gap: 8 },
  titulo: { fontSize: 20, fontWeight: '800', color: colors.primario, marginBottom: 4 },
  etiqueta: { fontSize: 14, color: colors.secundario },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borde, backgroundColor: colors.blanco, borderRadius: 10, padding: 12, fontSize: 16, color: colors.texto },
  area: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 14 },
  chipTextoElegido: { color: colors.blanco },
  disponible: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  error: { color: colors.error, fontSize: 14 },
  plato: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  oculto: { opacity: 0.7 },
  platoContenido: { flex: 1, gap: 3 },
  platoNombre: { fontSize: 16, fontWeight: '700', color: colors.texto },
  detalle: { color: colors.secundario, fontSize: 14 },
  accion: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
