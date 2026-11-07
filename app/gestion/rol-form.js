// F3 (mockups 15b y 15c, D-05): nuevo rol o edición de nombre, descripción y privilegios.
// El código y el alcance no se cambian después de crear (proteger_roles). Los privilegios
// globales solo se pueden marcar en roles de alcance global. Administrador general no se edita.
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { actualizar, crear, listarPrivilegios, obtener } from '../../services/roles';
import { agruparPrivilegios, alternarPrivilegio } from '../../services/permisos';
import { validarRol } from '../../services/validaciones';
import { useGuardiaPersonal } from '../../hooks/SesionPersonal';
import Boton from '../../components/Boton';
import Campo from '../../components/Campo';
import EstadoPantalla from '../../components/EstadoPantalla';

const vacio = { codigo: '', nombre: '', descripcion: '', alcance: 'sede', privilegios: [] };

export default function RolFormScreen() {
  const { rolId } = useLocalSearchParams();
  const nuevo = !rolId;
  const navigation = useNavigation();
  const [base, setBase] = useState({ cargando: true, error: null, rol: null, privilegios: [] });
  const [form, setForm] = useState(vacio);
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const bloqueo = useRef(false);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    navigation.setOptions({ title: nuevo ? 'Nuevo rol' : 'Editar rol' });
    setBase((b) => ({ ...b, cargando: true, error: null }));
    const [privilegios, rol] = await Promise.all([
      listarPrivilegios(), nuevo ? Promise.resolve({ data: null, error: null }) : obtener(rolId),
    ]);
    if (!montada.current) return;
    const error = privilegios.error ?? rol.error ?? (!nuevo && !rol.data ? 'El rol ya no existe.' : null);
    if (error) return setBase((b) => ({ ...b, cargando: false, error }));
    if (rol.data) {
      setForm({
        codigo: rol.data.codigo, nombre: rol.data.nombre, descripcion: rol.data.descripcion ?? '',
        alcance: rol.data.alcance, privilegios: rol.data.privilegios.map((p) => p.clave),
      });
    }
    setBase({ cargando: false, error: null, rol: rol.data, privilegios: privilegios.data ?? [] });
  }, [rolId, nuevo, navigation]);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; };
  }, [cargar]));

  const guardia = useGuardiaPersonal(['roles.gestionar'], { conSede: false });
  if (guardia) return guardia;
  if (base.cargando) return <EstadoPantalla cargando />;
  if (base.error) return <EstadoPantalla mensaje={base.error} onReintentar={cargar} />;
  if (!nuevo && base.rol?.codigo === 'admin_general') {
    return <EstadoPantalla mensaje="El rol Administrador general no se puede modificar." />;
  }

  const validacion = validarRol(form, { nuevo });
  const grupos = agruparPrivilegios(base.privilegios);
  const globales = new Set(base.privilegios.filter((p) => p.alcance === 'global').map((p) => p.clave));
  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const error = (campo) => (tocado ? validacion.errores[campo] : null);

  // Al pasar a alcance de sede se quitan los privilegios globales ya marcados.
  function cambiarAlcance(valor) {
    setForm((f) => ({
      ...f, alcance: valor,
      privilegios: valor === 'global' ? f.privilegios : f.privilegios.filter((clave) => !globales.has(clave)),
    }));
  }

  async function guardar() {
    setTocado(true);
    if (bloqueo.current || !validacion.valido) return;
    bloqueo.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const resultado = nuevo
        ? await crear({
          codigo: form.codigo.trim(), nombre: form.nombre.trim(), descripcion: form.descripcion.trim(),
          alcance: form.alcance, privilegios: form.privilegios,
        })
        : await actualizar(rolId, {
          nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), privilegios: form.privilegios,
        });
      if (!montada.current) return;
      if (resultado.error) setAviso(resultado.error); else router.back();
    } finally {
      bloqueo.current = false;
      if (montada.current) setEnviando(false);
    }
  }

  return <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      {!!aviso && <Text accessibilityRole="alert" style={styles.aviso}>{aviso}</Text>}
      {nuevo
        ? <Campo etiqueta="Código" value={form.codigo} onChangeText={(v) => cambiar('codigo', v)}
          editable={!enviando} autoCapitalize="none" autoComplete="off" error={error('codigo')}
          ayuda="Minúsculas y guion bajo, sin espacios. No se puede cambiar después." />
        : <View style={styles.grupo}>
          <Text style={styles.etiqueta}>Código</Text>
          <Text style={styles.valor}>{form.codigo}</Text>
        </View>}
      <Campo etiqueta="Nombre del rol" value={form.nombre} onChangeText={(v) => cambiar('nombre', v)}
        editable={!enviando} autoCapitalize="words" error={error('nombre')} />
      <Campo etiqueta="Descripción" value={form.descripcion} onChangeText={(v) => cambiar('descripcion', v)}
        editable={!enviando} multiline numberOfLines={3} error={error('descripcion')} />
      <Text style={styles.seccion}>Alcance</Text>
      {nuevo
        ? <View style={styles.chips}>
          {[['sede', 'Sede'], ['global', 'Global']].map(([valor, etiqueta]) => <Pressable key={valor}
            accessibilityRole="button" accessibilityState={{ selected: form.alcance === valor, disabled: enviando }}
            disabled={enviando} onPress={() => cambiarAlcance(valor)}
            style={[styles.chip, form.alcance === valor && styles.chipElegido]}>
            <Text style={[styles.chipTexto, form.alcance === valor && styles.chipTextoElegido]}>{etiqueta}</Text>
          </Pressable>)}
        </View>
        : <Text style={styles.valor}>{form.alcance === 'global' ? 'Global' : 'Sede'} (no se puede cambiar)</Text>}
      <Text style={styles.seccion}>Permisos</Text>
      {grupos.map((grupo) => <View key={grupo.titulo} style={styles.grupoPermisos}>
        <Text style={styles.tituloGrupo}>{grupo.titulo}{grupo.soloGlobal ? ' (solo roles globales)' : ''}</Text>
        {grupo.items.map((privilegio) => {
          const bloqueado = privilegio.alcance === 'global' && form.alcance !== 'global';
          const marcado = form.privilegios.includes(privilegio.clave);
          return <Pressable key={privilegio.clave} accessibilityRole="checkbox"
            accessibilityState={{ checked: marcado, disabled: bloqueado || enviando }}
            disabled={bloqueado || enviando}
            onPress={() => setForm((f) => ({ ...f, privilegios: alternarPrivilegio(f.privilegios, privilegio.clave) }))}
            style={[styles.permiso, bloqueado && styles.permisoBloqueado]}>
            <Ionicons name={marcado ? 'checkbox' : 'square-outline'} size={24}
              color={bloqueado ? colors.ocupado : colors.primario} />
            <Text style={[styles.permisoTexto, bloqueado && styles.permisoTextoBloqueado]}>{privilegio.descripcion}</Text>
          </Pressable>;
        })}
      </View>)}
      <Boton titulo={nuevo ? 'Crear rol' : 'Guardar rol'} cargando={enviando}
        disabled={tocado && !validacion.valido} onPress={guardar} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  contenido: { padding: 16, paddingBottom: 40, gap: 12 },
  aviso: { color: colors.error, fontSize: 14 },
  grupo: { gap: 4 },
  etiqueta: { fontSize: 14, color: colors.secundario },
  valor: { fontSize: 16, color: colors.texto },
  seccion: { fontSize: 16, fontWeight: '600', color: colors.texto, marginTop: 4 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde },
  chipElegido: { backgroundColor: colors.primario, borderColor: colors.primario },
  chipTexto: { color: colors.texto, fontSize: 15 },
  chipTextoElegido: { color: colors.blanco },
  grupoPermisos: { gap: 4 },
  tituloGrupo: { fontSize: 15, fontWeight: '600', color: colors.texto, marginTop: 6 },
  permiso: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  permisoBloqueado: { opacity: 0.45 },
  permisoTexto: { flex: 1, color: colors.texto, fontSize: 14, lineHeight: 20 },
  permisoTextoBloqueado: { color: colors.secundario },
});
