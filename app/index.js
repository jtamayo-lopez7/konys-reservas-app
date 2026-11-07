// RF-15: la raíz siempre abre la bienvenida, que aparece en cada arranque (decisión 2.8).
import { Redirect } from 'expo-router';

export default function Raiz() {
  return <Redirect href="/bienvenida" />;
}
