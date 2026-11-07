import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { hideAsync, preventAutoHideAsync, setOptions } from 'expo-splash-screen';
import { colors } from '../constants/colors';
import { ReservaProvider } from '../hooks/ReservaConfirmada';
import { SedeProvider } from '../hooks/SedeSeleccionada';
import { SesionPersonalProvider } from '../hooks/SesionPersonal';

// RF-15: el splash nativo se mantiene hasta que el primer layout está listo; así nunca se ve
// una pantalla en blanco entre el logo y la bienvenida.
preventAutoHideAsync();
setOptions({ duration: 400, fade: true });

export default function RootLayout() {
  useEffect(() => { hideAsync(); }, []);

  return <SedeProvider><SesionPersonalProvider><ReservaProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerTintColor: colors.primario, headerStyle: { backgroundColor: colors.blanco }, contentStyle: { backgroundColor: colors.fondo } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="bienvenida" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="reservar/[mesaId]" options={{ title: 'Reservar mesa' }} />
      <Stack.Screen name="confirmacion" options={{ headerShown: false, gestureEnabled: false }} />
      {/* F3: acceso de personal por la rueda de ajustes (05a), clave temporal (05e) y paneles (05b, 05c/05d). */}
      <Stack.Screen name="acceso" options={{ title: 'Ajustes' }} />
      <Stack.Screen name="cambiar-clave" options={{ title: 'Cambiar clave', headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="panel/index" options={{ headerShown: false }} />
      <Stack.Screen name="panel/sede" options={{ headerShown: false }} />
      <Stack.Screen name="gestion/reservas" options={{ title: 'Reservas' }} />
      <Stack.Screen name="gestion/mesas" options={{ title: 'Mesas' }} />
      <Stack.Screen name="gestion/horarios" options={{ title: 'Horarios' }} />
      <Stack.Screen name="gestion/mesa-form" options={{ title: 'Mesa' }} />
      <Stack.Screen name="gestion/carta" options={{ title: 'Carta' }} />
      {/* F3C: personal de la sede (14, 14c) y nuevo o editar usuario (14b). */}
      <Stack.Screen name="gestion/personal" options={{ title: 'Personal' }} />
      <Stack.Screen name="gestion/usuario-form" options={{ title: 'Usuario' }} />
      <Stack.Screen name="gestion/sedes" options={{ title: 'Sedes' }} />
      <Stack.Screen name="gestion/sede-form" options={{ title: 'Sede' }} />
    </Stack>
  </ReservaProvider></SesionPersonalProvider></SedeProvider>;
}
