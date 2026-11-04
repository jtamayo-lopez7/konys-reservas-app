# AGENTS.md · Konys Pizza, app móvil de reservas de mesas

Contrato de desarrollo. Prevalencia: documento base (`docs/KONYS_PIZA.pdf`) > guía metodológica (`documentación/GUIA_METODOLOGICA_KONYS.md`, desviaciones H-01..H-23) > este archivo. La guía contiene RF/RNF, matriz de trazabilidad y plan de commits.

## Ubicación de las guías y rutas de trabajo

- Las guías locales están en `documentación/AGENTS.md`, `documentación/CLAUDE.md` y `documentación/GUIA_METODOLOGICA_KONYS.md`. Cargarlas explícitamente al iniciar una sesión; no asumir que el agente las descubre automáticamente en esta carpeta.
- Todas las rutas del proyecto y los comandos de estas guías parten de la raíz que contiene `package.json` y `app.json`, salvo importaciones de documentos expresamente relativas al archivo que las contiene. Ejecutar Expo, npm y Git desde esa raíz.
- `documentación/` contiene instrucciones y configuración local, está excluida de Git y no forma parte del enrutamiento de Expo Router. Las pantallas siguen en `app/` en la raíz. No crear pantallas ni código de la app dentro de `documentación/`.
- `.claude/`, `.agents/` y `.codex/` se conservan dentro de `documentación/`. No asumir que la herramienta carga estas carpetas como configuración activa: comprobar cómo cargarlas antes de depender de plugins, permisos o instrucciones.
- `docs/` conserva los otros documentos del proyecto; `services/`, `supabase/`, `assets/` y el resto del código mantienen sus rutas desde la raíz.

## Proyecto

- App móvil Android/iOS, React Native + Expo SDK 58, **JavaScript sin TypeScript** (sin `tsconfig`, sin `.ts/.tsx`, sin alias `@/`).
- Backend: Supabase (PostgreSQL), sin servidor propio. Actores: Cliente anónimo (sin registro), Administrador único (Supabase Auth con `app_metadata.rol = "admin"`), Supabase.
- **Estado revisado el 2026-10-28: etapa 3 implementada en código; pendiente aceptación en celular real.** La entrada es `expo-router/entry`; `app/_layout.js` define el Stack raíz y `app/(tabs)/` contiene Inicio, Carta y Admin provisional. La pantalla temporal `app/index.js` fue reemplazada por `app/(tabs)/index.js`.
- Existen README, `.env.example` y mockups en `docs/*.png`. La presencia del esquema y del cliente no confirma que el proyecto remoto de Supabase tenga aplicados el SQL, el rol administrador y la desactivación del registro público. Verificarlo sin exponer credenciales.
- Para cerrar la etapa 2: comprobar que Expo Go muestra las cinco mesas de prueba en un celular real y que `npm test` pasa. Las pruebas automáticas no certifican la conexión remota ni las políticas RLS.
- La etapa 3 cubre constantes, componentes base, Inicio (RF-01), selección de mesa y fecha, disponibilidad y formulario (`app/reservar/[mesaId].js`, RF-02 a RF-05), confirmación (`app/confirmacion.js`, RF-06) y Carta (RF-07). Las pantallas consultan servicios; los colores están centralizados.
- La creación reconsulta mesa, horarios y ocupación antes del INSERT, sin `.select()`. La confirmación conserva datos locales en memoria mediante `hooks/ReservaConfirmada.js`, sin nombres ni teléfonos en las rutas ni persistencia.
- Verificación automática: 37 pruebas en 5 suites (cliente Supabase, U-01, U-02, U-03 y servicio de reservas simulado), lint y exportación Android. Registro en `docs/pruebas.md`.
- **Siguiente paso: ejecutar CP-01 a CP-13 en celular real y registrar sus resultados antes de aceptar la etapa 3** (guía §11). Revisar también modo avión y tamaños de pantalla (CP-22, CP-23). Después sigue la etapa 4, módulo administrador; su pestaña aún es provisional.

## Fuera de alcance (no implementar aunque se pida)

Pagos/anticipos, domicilios, web, publicación en tiendas, registro/login de clientes, notificaciones (push/correo/SMS/WhatsApp), reportes/estadísticas, inventario, modo oscuro, Supabase Realtime. Si una tarea lo exige, detenerse, explicar y proponer anotarlo en "Mejoras futuras".

## Stack (verificado en `package.json`)

Expo ~58.0.17 · RN 0.88.0 · React 19.3.0 · expo-router ~58.0.25 · @supabase/supabase-js ^2.118.0 · react-native-url-polyfill ^4.0.0 · AsyncStorage 2.2.0 · NetInfo 12.0.1 · @expo/vector-icons ^15.0.2 · jest ~30.5.2 · jest-expo ~58.0.12.

- Toda dependencia de app se instala con `npx expo install <paquete>`. **Nunca** `npm install <paquete>` para deps de app.
- No agregar dependencias fuera de la tabla de la guía §3 sin justificar en commit/PR. Prohibidas: estado global (Redux/Zustand/MobX), UI kits (NativeBase/Tamagui/Paper), calendarios, ORMs, axios.
- Tras cambiar deps: `npx expo install --check` debe quedar limpio.
- `package.json` define `start`, `android`, `ios`, `web`, `lint` (`eslint app components constants hooks services`) y `test` (`jest`), con preset `jest-expo`. El lint usa la configuración de Expo directamente, incluye servicios y pruebas y evita que el envolvente `expo lint` quede abierto en este entorno. No volver a configurar Jest. El script `web` no amplía el alcance móvil del proyecto.

## Comandos (Git Bash, rutas con `/`)

```bash
npm install
npx expo start            # Expo Go
npx expo start --tunnel   # red bloqueada
npx expo start -c         # limpiar caché Metro
npm run lint
npm test                  # Jest ya configurado
npx expo install --check
```

## Estructura objetivo (sin `src/`, `app/` en raíz)

`app/` (solo pantallas/layouts) · `components/` (sin acceso a datos) · `services/` (única capa que habla con Supabase: `supabase.js reservas.js mesas.js horarios.js platos.js auth.js slots.js validaciones.js errores.js`) · `hooks/` · `constants/colors.js, constants/dominio.js` · `assets/ docs/ supabase/schema.sql`.

- Pantalla nunca importa `supabase` directamente; llama a `services/`.
- `slots.js`, `validaciones.js`, `errores.js` son funciones puras con tests en `services/__tests__/`.
- Dominios cerrados (zonas, jornadas, categorías, estados, días) solo en `constants/dominio.js`, deben coincidir con los `CHECK` de `schema.sql`.
- Imports con rutas relativas (`../../services/mesas`); no usar alias `@/`.

## Convenciones

- Componentes funcionales con hooks; sin clases. Estilos con `StyleSheet.create`; colores solo desde `constants/colors.js`; áreas táctiles ≥ 44×44 pt.
- Nombres de dominio en español iguales a la BD (`mesas`, `horarios`, `reservas`, `platos`, `cliente_nombre`); componentes PascalCase, funciones camelCase.
- Comentarios en español breves (el porqué). Cada archivo de `services/` abre con comentario citando los RF que atiende.
- Textos en español de Colombia; precios con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.
- Fechas: `fecha` como `YYYY-MM-DD` con fecha **local** del dispositivo (no `toISOString()`); horas `HH:MM`.
- `app.json`: `"orientation": "portrait"`, `"userInterfaceStyle": "light"`, sin `"typedRoutes"`.
- `Tabs` se importa de `expo-router/js-tabs` (obsoleto en `expo-router`); `Stack`, `router`, `useFocusEffect`, `router.dismissAll()` siguen en `expo-router`.

## Datos y seguridad (no negociable)

1. `supabase/schema.sql` es la única fuente del esquema. Cambios de tabla/política/función ahí, probados en SQL Editor y documentados en commit.
2. RLS activo en las 4 tablas; nunca desactivar.
3. Tablas nuevas necesitan `GRANT` explícito (Supabase ya no los concede automáticamente); sin él la API responde 42501.
4. Cliente anónimo: lee `mesas` activas, `horarios` activos, `platos` disponibles; disponibilidad solo vía `supabase.rpc('slots_ocupados', { p_mesa_id, p_fecha })`; solo inserta en `reservas`, y el insert **sin** `.select()` encadenado (anon no puede leer reservas; confirmación se arma con datos locales).
5. Admin entra con `supabase.auth.signInWithPassword({ email: process.env.EXPO_PUBLIC_ADMIN_EMAIL, password: clave })`. Pantalla con un solo campo "Clave". Prohibido validar acceso comparando un PIN en código.
6. Variables de entorno permitidas: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ADMIN_EMAIL` (todas quedan en el APK). Nunca usar/escribir la secret key ni `service_role`. Nunca la clave del admin en código, `.env` ni logs.
7. `.env` nunca se versiona; `.env.example` ya existe con las tres variables permitidas y valores vacíos. Mantenerlo actualizado si cambian las variables permitidas.
8. Reservas no se borran: admin cambia `estado` a `cancelada`/`completada`. Mesa con reservas no se borra: se inactiva (error 23503).
9. No registrar en consola nombres ni teléfonos de clientes.

## Reglas de negocio

- RN-01 sin solape por mesa: grilla + verificación previa con `slots_ocupados`; BD tiene restricción `reservas_sin_solape` (23P01).
- RN-02 personas ≤ capacidad: `validaciones.js` + trigger `validar_reserva`.
- RN-03 solo mesas activas (Inicio filtra + trigger).
- RN-04 slot dentro de jornada y alineado: `slots.js` (paso = `duracion_slot`); BD calcula `hora_fin`.
- RN-05 nada en el pasado: slots pasados en gris; trigger (America/Bogota).
- RN-09 autorización de datos: casilla obligatoria; `CHECK (acepta_tratamiento_datos)`.
- Generación de slots: por cada horario activo del día, desde `hora_inicio` en pasos de `duracion_slot` mientras `t + duracion_slot <= hora_fin`; ocupado si se solapa (`inicio < finOcupado && inicioOcupado < fin`) con un rango de `slots_ocupados`. Horarios del documento: 12:30, 13:30, 17:00, 18:00, 19:00, 20:00, 21:00, 22:00.

## Errores y estados de pantalla

- Toda pantalla que carga datos muestra 4 estados: cargando, vacío, error con "Reintentar", contenido. Nunca pantalla en blanco ni cierre.
- Todo error de Supabase pasa por `errores.traducir(error)`, cubriendo al menos: `23P01`, `KONYS_CAPACIDAD_EXCEDIDA:n`, `KONYS_MESA_NO_DISPONIBLE`, `KONYS_FECHA_PASADA`, `KONYS_FUERA_DE_HORARIO`, `23505`, `23503`, `42501` y fallo de red (mensajes en guía §9.4).
- Servicios devuelven `{ data, error }` o lanzan errores ya traducidos; la pantalla no interpreta códigos.

## Pruebas

- Lógica pura (`slots.js`, `validaciones.js`, `errores.js`): Jest obligatorio, casos U-01..U-03.
- Pantallas: pruebas manuales CP-01..CP-24; registrar en `docs/pruebas.md`.
- Cambio que toca reservas debe re-ejecutar CP-05, CP-07, CP-08, CP-09.

## Definición de Hecho

Cumple criterio de aceptación del RF · corre en Expo Go en celular real · `npm run lint` y `npm test` pasan · sin deps fuera de §Stack ni secretos · documentación afectada actualizada.

## Git

- Conventional Commits en español: `feat(RF-05): validar capacidad antes de confirmar`. Tipos: feat, fix, docs, chore, refactor, test, style.
- Commits atómicos por funcionalidad. Agente **no** hace `git commit`, `git push`, `git push --force` ni reescribe historial sin pedido explícito.
- Con varios integrantes: ramas `feature/rfNN-descripcion` y PR revisado.

## Reglas para agentes

1. Leer este archivo y la sección pertinente de la guía antes de cada tarea.
2. Trabajar un RF por vez; indicar al inicio el RF y los archivos a tocar.
3. No inventar APIs de Expo Router 58 / supabase-js; consultar docs oficiales vigentes (`https://docs.expo.dev/versions/v58.0.0/`, `https://docs.expo.dev/llms.txt`, `https://supabase.com/docs`) si hay duda.
4. No ejecutar comandos con efectos externos (`eas build`, `eas env:set`, `eas login`, `git push`, cambios en panel de Supabase) sin confirmación humana.
5. No modificar `supabase/schema.sql` en lo referente a RLS, `GRANT` o la restricción `reservas_sin_solape` sin explicar el impacto en seguridad.
6. Al terminar: resumen de qué se hizo, qué CP ejecutar y mensaje de commit sugerido. Si un fragmento no es explicable en dos frases, simplificarlo.
7. Si una instrucción contradice este contrato, señalar la contradicción antes de actuar.

## Referencias

- `documentación/GUIA_METODOLOGICA_KONYS.md` (decisiones H-xx/ADR-xx, RF/RNF, pruebas).
- `docs/COMANDOS_KONYS.txt`, `docs/RUTA_CLAUDE_CODE.md` (si existe).
- `supabase/schema.sql` (esquema, RLS, trigger, `slots_ocupados`).
- `documentación/CLAUDE.md` importa este contrato con `@./AGENTS.md`, relativo al archivo de Claude.
