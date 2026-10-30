// RF-11: fila editable de horario (presentacional).
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { DIAS_LARGO, JORNADAS } from '../constants/dominio';

export default function FilaHorario({ dia, jornada, horario, borrador, editando, procesando,
  onEditar, onGuardar, onCancelar, onCambio, errores }) {
  if (!horario) {
    // La BD crea las 14 filas; si falta una, se informa en lugar de romper.
    return <View style={styles.fila}>
      <Text style={styles.etiqueta}>{DIAS_LARGO[dia]} · {JORNADAS[jornada]}</Text>
      <Text style={styles.sinFila}>Sin jornada registrada</Text>
    </View>;
  }
  if (!editando) {
    return <View style={styles.fila}>
      <View style={styles.contenido}>
        <Text style={styles.etiqueta}>{DIAS_LARGO[dia]} · {JORNADAS[jornada]}</Text>
        <Text style={styles.valor}>{horario.hora_inicio.slice(0, 5)} – {horario.hora_fin.slice(0, 5)} · {horario.duracion_slot} min</Text>
        <Text style={styles.estado}>{horario.activo ? 'Activo' : 'Inactivo'}</Text>
      </View>
      <Switch accessibilityLabel={`Jornada ${JORNADAS[jornada]} de ${DIAS_LARGO[dia]} activa`} value={horario.activo}
        disabled={procesando} onValueChange={(valor) => onCambio({ activo: valor })}
        trackColor={{ true: colors.primario, false: colors.ocupado }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${DIAS_LARGO[dia]} ${JORNADAS[jornada]}`}
        disabled={procesando} onPress={onEditar} style={styles.accion} hitSlop={8}>
        <Ionicons name="pencil-outline" size={22} color={colors.primario} />
      </Pressable>
    </View>;
  }
  // En edición, el modelo editable es el borrador del padre. Si el TextInput
  // quedara controlado por la fila original, cada tecla se descartaría al
  // re-renderizar y el campo no aceptaría cambios.
  const modelo = borrador ?? horario;
  const campo = (etiqueta, nombre, extra = {}) => <View style={styles.grupo} key={nombre}>
    <Text style={styles.etiqueta}>{etiqueta}</Text>
    <TextInput accessibilityLabel={etiqueta} value={String(modelo[nombre] ?? '')}
      onChangeText={(valor) => onCambio({ [nombre]: valor })} editable={!procesando}
      style={[styles.input, errores[nombre] && styles.inputError]} {...extra} />
    {!!errores[nombre] && <Text style={styles.error}>{errores[nombre]}</Text>}
  </View>;
  return <View style={[styles.fila, styles.formulario]}>
    <Text style={styles.titulo}>{DIAS_LARGO[dia]} · {JORNADAS[jornada]}</Text>
    {campo('Hora inicio (HH:MM)', 'hora_inicio', { keyboardType: 'number-pad' })}
    {campo('Hora fin (HH:MM)', 'hora_fin', { keyboardType: 'number-pad' })}
    {campo('Duración del slot (min)', 'duracion_slot', { keyboardType: 'number-pad' })}
    <View style={styles.botones}>
      <Pressable accessibilityRole="button" accessibilityLabel="Guardar jornada" disabled={procesando}
        onPress={onGuardar} style={styles.accionIcono} hitSlop={8}>
        <Ionicons name="checkmark-circle-outline" size={30} color={colors.primario} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancelar edición" disabled={procesando}
        onPress={onCancelar} style={styles.accionIcono} hitSlop={8}>
        <Ionicons name="close-circle-outline" size={30} color={colors.secundario} />
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.blanco, borderWidth: 1, borderColor: colors.borde, borderRadius: 14, marginBottom: 10 },
  formulario: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  contenido: { flex: 1, gap: 3 },
  etiqueta: { color: colors.secundario, fontSize: 13, fontWeight: '600' },
  valor: { color: colors.texto, fontSize: 15 },
  estado: { color: colors.texto, fontSize: 13, fontWeight: '600' },
  sinFila: { flex: 1, color: colors.secundario, fontSize: 14 },
  titulo: { fontSize: 15, fontWeight: '700', color: colors.texto },
  grupo: { gap: 4 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.borde, backgroundColor: colors.blanco, borderRadius: 10, padding: 10, fontSize: 15, color: colors.texto },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 13 },
  botones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  accion: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  accionIcono: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
