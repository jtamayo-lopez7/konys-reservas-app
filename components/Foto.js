import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/colors';

function Imagen({ uri, nombre }) {
  const [fallo, setFallo] = useState(false);
  return !fallo && uri ? (
    <Image source={{ uri }} accessibilityLabel={nombre} style={styles.foto} onError={() => setFallo(true)} />
  ) : (
    <View style={styles.foto}><Ionicons name="image-outline" size={28} color={colors.secundario} /></View>
  );
}

export default function Foto({ uri, nombre }) {
  return <Imagen key={uri || 'sin-foto'} uri={uri} nombre={nombre} />;
}

const styles = StyleSheet.create({
  foto: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.fondo, justifyContent: 'center', alignItems: 'center' },
});
