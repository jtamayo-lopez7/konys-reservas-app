import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../services/supabase';

// Pantalla temporal de prueba (Etapa 2): lista las mesas activas.
// Sustituida por las pantallas reales (Inicio / Reservar) en la Etapa 3.
export default function InicioScreen() {
  const [mesas, setMesas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarMesas = useCallback(async () => {
    setCargando(true);
    setError(null);
    const { data, error: errorConsulta } = await supabase
      .from('mesas')
      .select('*')
      .eq('activa', true);
    if (errorConsulta) {
      setMesas([]);
      setError(errorConsulta);
    } else {
      setMesas(data ?? []);
    }
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarMesas();
    }, [cargarMesas])
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0F2B3D" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.mensajeError}>
          No pudimos cargar las mesas. Revisa tu conexión y vuelve a intentar.
        </Text>
        <TouchableOpacity style={styles.boton} onPress={cargarMesas}>
          <Text style={styles.botonTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mesas.length === 0) {
    return (
      <View style={styles.centrado}>
        <Text>No hay mesas disponibles</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={mesas}
      keyExtractor={(mesa) => mesa.id}
      contentContainerStyle={styles.lista}
      renderItem={({ item }) => (
        <View style={styles.tarjeta}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          <Text style={styles.detalle}>
            {item.zona} · {item.capacidad} personas
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  lista: {
    padding: 16,
  },
  tarjeta: {
    backgroundColor: '#F5F6F7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B1B1B',
  },
  detalle: {
    fontSize: 14,
    color: '#1B1B1B',
    marginTop: 4,
  },
  mensajeError: {
    fontSize: 16,
    color: '#1B1B1B',
    textAlign: 'center',
    marginBottom: 16,
  },
  boton: {
    backgroundColor: '#0F2B3D',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
