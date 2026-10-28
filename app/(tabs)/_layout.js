import { Tabs } from 'expo-router/js-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/colors';

const iconos = { index: 'home-outline', carta: 'restaurant-outline', admin: 'lock-closed-outline' };

export default function TabsLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerStyle: { backgroundColor: colors.fondo },
      headerTintColor: colors.primario,
      tabBarActiveTintColor: colors.primario,
      tabBarInactiveTintColor: colors.secundario,
      tabBarStyle: { backgroundColor: colors.blanco },
      tabBarIcon: ({ color, size }) => <Ionicons name={iconos[route.name]} color={color} size={size} />,
    })}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="carta" options={{ title: 'Carta' }} />
      <Tabs.Screen name="admin" options={{ title: 'Admin' }} />
    </Tabs>
  );
}
