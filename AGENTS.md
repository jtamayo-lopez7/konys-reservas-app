# AGENTS.md · Konys Pizza (app móvil de reservas de mesas)

Guía para agentes de IA. Contrato de desarrollo completo en `documentos/AGENTS.md`; guía metodológica en `documentos/GUIA_METODOLOGICA_KONYS.md`. Leerlos antes de trabajar si la tarea lo requiere. Ejecutar todos los comandos desde la raíz del proyecto (donde está `package.json`).

## Qué es el proyecto

App móvil (Android/iOS) para que los clientes de Konys Pizza (Bucaramanga) reserven mesa viendo disponibilidad por franjas, y para que un administrador gestione mesas, horarios, reservas y carta. Backend: Supabase (PostgreSQL) sin servidor propio.

- Stack: Expo SDK 58 · React Native 0.88 · React 19 · Expo Router · @supabase/supabase-js · Jest (jest-expo).
- **JavaScript puro, sin TypeScript** y sin alias de rutas (`@/`): imports siempre relativos.
- Los nombres de dominio están en español e iguales a la BD (`mesas`, `horarios`, `reservas`, `platos`, `cliente_nombre`, etc.).

## Comandos

```bash
npm install
npx expo start          # Expo Go (QR)
npx expo start -c       # limpiar caché de Metro
npm run lint            # eslint sobre app components constants hooks services
npm test                # Jest
npx expo install --check
```

- Toda dependencia de app se instala con `npx expo install <paquete>`, nunca `npm install <paquete>`.
- Pruebas de SQL: pegar el script en Supabase > SQL Editor (sin migraciones locales).

## Estructura

- `app/` — solo pantallas y layouts de Expo Router (en raíz, sin `src/`):
  - `(tabs)/` — pestañas `index` (Inicio), `carta`, `admin`; el layout usa `Tabs` de `expo-router/js-tabs`.
  - `reservar/[mesaId].js` — formulario de reserva por mesa; `confirmacion.js` — confirmación con datos locales.
- `components/` — componentes presentacionales (PascalCase: `Boton`, `MesaCard`, `SlotButton`, `SelectorFecha`, `EstadoPantalla`, `PlatoItem`, `Foto`). No acceden a datos.
- `services/` — única capa que habla con Supabase: `supabase.js` (cliente), `mesas.js`, `horarios.js`, `reservas.js`, `platos.js`, `slots.js`, `validaciones.js`, `errores.js`, `consultas.js`.
- `constants/` — `colors.js` (paleta única de colores) y `dominio.js` (zonas, jornadas, categorías, estados, días; debe coincidir con los `CHECK` de `supabase/schema.sql`).
- `hooks/` — hooks compartidos.
- `supabase/` — `schema.sql` (esquema, RLS, trigger, función `slots_ocupados`, carta) y `seed_carta.sql` (carga idempotente de la carta real de 30 productos).
- `docs/` — capturas y registro de pruebas manuales (`docs/pruebas.md`, CP-01..CP-13).
- `documentos/` — guías locales (excluidas de Git según el README).

## Reglas inamovibles (resumen del contrato)

1. **Pantallas nunca importan `supabase` directamente**: siempre vía `services/`. Los servicios devuelven `{ data, error }` con mensajes ya traducidos por `errores.traducir`.
2. `slots.js`, `validaciones.js` y `errores.js` son funciones puras con tests obligatorios en `services/__tests__/`.
3. Cliente anónimo solo lee `mesas` activas, `horarios` activos y `platos` disponibles; la disponibilidad se consulta con `supabase.rpc('slots_ocupados', ...)`; inserta en `reservas` **sin** `.select()` encadenado (no puede leer reservas).
4. Fechas locales (`YYYY-MM-DD` desde el dispositivo, nunca `toISOString()`); horas `HH:MM`; precios con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.
5. Toda pantalla que carga datos muestra los 4 estados (cargando, vacío, error con "Reintentar", contenido) vía `EstadoPantalla`.
6. Colores solo desde `constants/colors.js`; estilos con `StyleSheet.create`; áreas táctiles ≥ 44×44 pt.
7. `.env` nunca se versiona (ya está en `.gitignore`); solo variables `EXPO_PUBLIC_*`; nunca la secret key de Supabase ni la clave del admin en código o logs.
8. No desactivar RLS; no borrar reservas (se cancelan/completan); mesas con reservas se inactivan.
9. Fuera de alcance salvo pedido explícito y aprobación: pagos, domicilios, notificaciones, registro de clientes, modo oscuro, realtime, publicación en tiendas.

## Convenciones de código

- Componentes funcionales con hooks; sin clases.
- Comentarios breves en español, explicando el porqué; cada archivo de `services/` abre citando los RF que atiende.
- Textos en español de Colombia.
- Errores de Supabase siempre traducidos (códigos clave: `23P01`, `23505`, `23503`, `42501`, `KONYS_*`).

## Git

- Conventional Commits en español: `feat(RF-05): validar capacidad antes de confirmar` (feat, fix, docs, chore, refactor, test, style).
- Commits atómicos. **No** hacer `git commit`, `git push` ni reescribir historial sin confirmación explícita del usuario.
- No ejecutar comandos con efectos externos (`eas build`, `eas login`, cambios en el panel de Supabase) sin confirmación.

## Definición de Hecho

Criterio de aceptación cumplido · corre en Expo Go en celular real · `npm run lint` y `npm test` pasan · sin dependencias nuevas sin justificar · documentación afectada actualizada. Al terminar: resumen de lo hecho, qué CP re-ejecutar y mensaje de commit sugerido.
