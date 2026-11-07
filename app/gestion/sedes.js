// RF-16: lista de sedes del administrador (mockup 13).
// La principal no muestra interruptor (D-03). Eliminar sede se habilita en F4 (13d); el correo
// del administrador de cada sede llega con F3.
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';
import { cambiarEstado, listarTodas } from '../../services/sedes';
import { useGuardiaPersonal, useSesionPersonal } from '../../hooks/SesionPersonal';
import EstadoPantalla from '../../components/EstadoPantalla';

export default function SedesScreen() {
  // F3: solo con sedes.gestionar (admin general).
  const { sedeGestion: sedeActual, elegirSede: seleccionar } = useSesionPersonal();
  const [estado, setEstado] = useState({ data: [], cargando: true, error: null });
  const [procesandoId, setProcesandoId] = useState(null);
  const [aviso, setAviso] = useState(null);
  const solicitud = useRef(0);
  const montada = useRef(true);

  const cargar = useCallback(async () => {
    const id = ++solicitud.current;
    setEstado({ data: [], cargando: true, error: null });
    const resultado = await listarTodas();
    if (id === solicitud.current && montada.current) setEstado({ ...resultado, cargando: false });
  }, []);

  useFocusEffect(useCallback(() => {
    montada.current = true;
    cargar();
    return () => { montada.current = false; solicitud.current += 1; };
  }, [cargar]));

  async function alternar(sede) {
    setProcesandoId(sede.id);
    setAviso(null);
    const resultado = await cambiarEstado(sede.id, !sede.activa);
    if (!montada.current) return;
    setProcesandoId(null);
    if (resultado.error) { setAviso(resultado.error); return; }
    // Mantiene al día la sede que se está gestionando (nombre y estado).
    if (sedeActual?.id === sede.id) seleccionar(resultado.data);
    await cargar();
  }

  const guardia = useGuardiaPersonal(['sedes.gestionar'], { conSede: false });
  if (guardia) return guardia;
  if (estado.cargando) return <EstadoPantalla cargando />;
  if (estado.error) return <EstadoPantalla mensaje={estado.error} onReintentar={cargar} />;

  return <View style={styles.pantalla}>
    <FlatList data={estado.data ?? []} keyExtractor={(s) => s.id} contentContainerStyle={styles.lista}
      onRefresh={cargar} refreshing={estado.cargando}
      ListHeaderComponent={<View style={styles.cabecera}>
        <Text style={styles.secundario}>Cada sede tiene sus mesas, horarios, carta y reservas.</Text>
        {!!aviso && <Text accessibilityRole="alert" style={styles.error}>{aviso}</Text>}
      </View>}
      ListEmptyComponent={<EstadoPantalla mensaje="No hay sedes registradas." />}
      ListFooterComponent={<View style={styles.nota}>
        <Text style={styles.secundario}>La sede principal no se puede desactivar ni eliminar. Desactivar una sede la oculta a los clientes y conserva sus datos.</Text>
      </View>}
      renderItem={({ item }) => <View style={[styles.fila, !item.activa && styles.inactiva]}>
        <View style={styles.filaTexto}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          <Text style={styles.secundario}>{[item.es_principal && 'Principal', !item.activa && 'Inactiva', item.direccion].filter(Boolean).join(' · ')}</Text>
        </View>
        {!item.es_principal && <Switch accessibilityLabel={`${item.activa ? 'Desactivar' : 'Activar'} ${item.nombre}`}
          value={item.activa} disabled={procesandoId === item.id} onValueChange={() => alternar(item)}
          trackColor={{ true: colors.primario, false: colors.ocupado }} />}
        <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.nombre}`} disabled={procesandoId === item.id}
          onPress={() => router.push({ pathname: '/gestion/sede-form', params: { sedeId: item.id } })} style={styles.accion} hitSlop={8}>
          <Ionicons name="pencil-outline" size={22} color={colors.primario} />
        </Pressable>
      </View>} />
    <Pressable accessibilityRole="button" accessibilityLabel="Crear sede" onPress={() => router.push('/gestion/sede-form')} style={styles.fab}>
      <Ionicons name="add" size={32} color={colors.blanco} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.fondo },
  lista: { padding: 16, paddingBottom: 100, gap: 12 },
  cabecera: { gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  inactiva: { opacity: 0.75 },
  filaTexto: { flex: 1, gap: 3 },
  nombre: { fontSize: 16, fontWeight: '700', color: colors.texto },
  secundario: { fontSize: 14, color: colors.secundario },
  error: { color: colors.error, fontSize: 14 },
  nota: { padding: 14, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14 },
  accion: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
});
