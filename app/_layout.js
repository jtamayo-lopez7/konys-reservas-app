import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { ReservaProvider } from '../hooks/ReservaConfirmada';

export default function RootLayout() {
  return <ReservaProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerTintColor: colors.primario, headerStyle: { backgroundColor: colors.blanco }, contentStyle: { backgroundColor: colors.fondo } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="reservar/[mesaId]" options={{ title: 'Reservar mesa' }} />
      <Stack.Screen name="confirmacion" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="gestion/mesa-form" options={{ title: 'Mesa' }} />
      <Stack.Screen name="gestion/carta" options={{ title: 'Carta · administración' }} />
    </Stack>
  </ReservaProvider>;
}
