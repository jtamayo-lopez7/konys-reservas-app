// F3 (mockup 15, D-05): roles y permisos. Requiere `roles.gestionar` (solo admin general).
// - El interruptor oculta o reactiva un rol sin borrarlo.
// - La papelera suprime un rol personalizado; si tiene usuarios o es un rol del sistema
//   protegido, la base responde con el error traducido.
// - El rol Administrador general no se puede editar, ocultar ni suprimir (candado).
import { useCallback, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { cambiarActivo, eliminar, listar } from '../../services/roles';
import { ordenarRoles, resumenRol } from '../../services/permisos';
import { useGuardiaPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';

export default function RolesScreen() {
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [procesandoId, setProcesandoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const solicitud = useRef(0);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listar();
    if (id === solicitud.current && montada.current) {
      setEstado({ ...resultado, data: ordenarRoles(resultado.data ?? []), cargando: false });
    }
  }, []);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  const guardia = useGuardiaPersonal(['roles.gestionar'], { conSede: false });
  if (guardia) return guardia;
  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;

  async function alternar(rol) {
    setProcesandoId(rol.id);
    setAviso(null);
    const resultado = await cambiarActivo(rol.id, !rol.activo);
    if (!montada.current) return;
    setProcesandoId(null);
    if (resultado.error) setAviso(resultado.error); else await cargar();
  }

  async function confirmarEliminar(rol) {
    setAEliminar(null);
    setProcesandoId(rol.id);
    setAviso(null);
    const resultado = await eliminar(rol.id);
    if (!montada.current) return;
    setProcesandoId(null);
    if (resultado.error) setAviso(resultado.error); else await cargar();
  }

  return <View style={styles.pantalla}>
    {!!aviso && <Text accessibilityRole="alert" style={styles.aviso}>{aviso}</Text>}
    <FlatList data={estado.data} keyExtractor={(r) => r.id} contentContainerStyle={styles.lista}
      onRefresh={cargar} refreshing={estado.cargando}
      ListHeaderComponent={<Text style={styles.intro}>Los roles son globales; cada usuario tiene uno y pertenece a una sede. Ocultar un rol lo desactiva para todos sus usuarios.</Text>}
      ListEmptyComponent={<EstadoPantalla mensaje="No hay roles registrados." />}
      ListFooterComponent={<View style={styles.nota}>
        <Text style={styles.secundario}>Un rol con usuarios asignados no se puede suprimir: primero reasígnalos a otro rol. El rol Administrador general no se puede editar, ocultar ni suprimir.</Text>
      </View>}
      renderItem={({ item }) => {
        const protegido = item.codigo === 'admin_general';
        const procesando = procesandoId === item.id;
        return <View style={styles.fila}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.nombre}`}
            accessibilityState={{ disabled: protegido }} disabled={protegido}
            onPress={() => router.push({ pathname: '/gestion/rol-form', params: { rolId: item.id } })}
            style={styles.contenido}>
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.detalle}>{resumenRol(item)}</Text>
          </Pressable>
          {protegido
            ? <View style={styles.accion}><Ionicons name="lock-closed-outline" size={22} color={colors.secundario} /></View>
            : <>
              <Switch accessibilityLabel={`${item.activo ? 'Ocultar' : 'Reactivar'} ${item.nombre}`}
                value={item.activo} disabled={procesando} onValueChange={() => alternar(item)}
                trackColor={{ true: colors.primario, false: colors.ocupado }} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Suprimir ${item.nombre}`}
                disabled={procesando} onPress={() => { setAviso(null); setAEliminar(item); }}
                style={styles.accion} hitSlop={8}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </Pressable>
            </>}
        </View>;
      }} />
    <Pressable accessibilityRole="button" accessibilityLabel="Nuevo rol" onPress={() => router.push('/gestion/rol-form')} style={styles.fab}>
      <Ionicons name="add" size={32} color={colors.blanco} />
    </Pressable>
    <Modal transparent visible={!!aEliminar} animationType="fade" onRequestClose={() => setAEliminar(null)}>
      <View style={styles.modalFondo}>
        <View style={styles.modalCaja}>
          <Text style={styles.modalTitulo}>¿Suprimir el rol «{aEliminar?.nombre}»?</Text>
          <Text style={styles.modalTexto}>Si tiene usuarios asignados, primero reasígnalos a otro rol. Si solo quieres desactivarlo, usa el interruptor.</Text>
          <View style={styles.modalAcciones}>
            <Pressable accessibilityRole="button" onPress={() => setAEliminar(null)} style={[styles.modalBoton, styles.modalCancelar]}>
              <Text style={styles.modalCancelarTexto}>Cancelar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => confirmarEliminar(aEliminar)} style={[styles.modalBoton, styles.modalBorrar]}>
              <Text style={styles.modalBorrarTexto}>Suprimir rol</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  intro: { fontSize: 14, color: colors.secundario, lineHeight: 20, marginBottom: 4 },
  aviso: { color: colors.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 16, paddingTop: 12 },
  lista: { padding: 16, paddingBottom: 100, gap: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  contenido: { flex: 1, gap: 3, minHeight: 44, justifyContent: 'center' },
  nombre: { fontSize: 16, fontWeight: '700', color: colors.texto },
  detalle: { fontSize: 13, color: colors.secundario },
  accion: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  nota: { padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  secundario: { fontSize: 14, color: colors.secundario, lineHeight: 20 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCaja: { width: '100%', maxWidth: 420, backgroundColor: colors.blanco, borderRadius: 16, padding: 20, gap: 12 },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: colors.texto },
  modalTexto: { fontSize: 15, color: colors.texto, lineHeight: 21 },
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBoton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  modalCancelar: { backgroundColor: colors.fondo, borderWidth: 1, borderColor: colors.borde },
  modalCancelarTexto: { color: colors.texto, fontSize: 16, fontWeight: '600' },
  modalBorrar: { backgroundColor: colors.error },
  modalBorrarTexto: { color: colors.blanco, fontSize: 16, fontWeight: '600' },
});
