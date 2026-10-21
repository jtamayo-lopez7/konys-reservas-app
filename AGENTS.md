# AGENTS.md · Konys Pizza, app móvil de reservas de mesas

Contrato de desarrollo para cualquier persona o agente de IA (Claude Code, Codex, Copilot, Cursor u otro) que escriba, modifique o revise código en este repositorio. Se deriva de `docs/GUIA_METODOLOGICA_KONYS.md` v1.2 (2026-10-21), que a su vez se deriva del documento base `docs/KONYS_PIZA.pdf`. Ante conflicto, el orden de prevalencia es: documento base, guía metodológica (en sus desviaciones justificadas H-01 a H-23), este archivo.

Versión del contrato: 1.1 · 2026-10-21 (JavaScript, estructura del documento, Git Bash)

## 1. Qué se construye

App móvil (Android e iOS) en React Native + Expo, escrita en JavaScript, para que los clientes de Konys Pizza (Bucaramanga) reserven mesa viendo la disponibilidad por franjas, y para que un administrador gestione mesas, horarios, reservas y carta. Back-end: Supabase (PostgreSQL), sin servidor propio.

Actores: Cliente (anónimo, sin registro), Administrador (un único usuario de Supabase Auth con `app_metadata.rol = "admin"`), Supabase.

## 2. Alcance cerrado

Dentro: RF-01 a RF-14 y RNF-01 a RNF-09 de la guía (sección 7), más la casilla de autorización de datos personales (H-19, Ley 1581 de 2012).

Fuera, y no se implementa aunque se pida de pasada: pagos o anticipos, domicilios, versión web, publicación en tiendas, registro o login de clientes, notificaciones (push, correo, SMS, WhatsApp), reportes o estadísticas, inventario, modo oscuro, Supabase Realtime.

Si una tarea exige algo fuera del alcance, el agente se detiene, lo explica y propone anotarlo en "Mejoras futuras". No lo implementa.

## 3. Stack y versiones

| Componente | Versión | Cómo se instala |
|---|---|---|
| Node.js | 24 LTS (Expo 58 acepta ^22.13, ^24.3, >=26) | nodejs.org |
| Expo SDK | 58 | plantilla `create-expo-app@latest` |
| React Native / React | 0.88.0 / 19.3.0 | las fija el SDK |
| JavaScript | ES6+ (sin TypeScript, como pide el documento) | — |
| Expo Router | ~58.0 | plantilla |
| @supabase/supabase-js | 2.x | `npx expo install` |
| react-native-url-polyfill | 4.x | `npx expo install` |
| @react-native-async-storage/async-storage | la del SDK (2.2.0) | `npx expo install` |
| @react-native-community/netinfo | la del SDK | `npx expo install` |
| @expo/vector-icons | la del SDK | `npx expo install` |
| jest-expo, jest | la del SDK | `npx expo install jest-expo jest -- --save-dev` |
| eas-cli | 25.x | `npm install -g eas-cli` |
| Terminal | Git Bash (Git para Windows), como terminal de VS Code | git-scm.com |

Reglas:

- Toda dependencia de la app se instala con `npx expo install <paquete>`. Nunca `npm install <paquete>` para dependencias de la app, porque elige versiones incompatibles con el SDK (por ejemplo AsyncStorage 3.x).
- No agregar dependencias fuera de esta tabla sin justificarlo en el mensaje del commit y en la descripción del PR. Prohibidas: librerías de estado global (Redux, Zustand, MobX), UI kits completos (NativeBase, Tamagui, React Native Paper), librerías de calendario, ORMs, axios.
- Tras cambiar dependencias: `npx expo install --check` debe quedar limpio.

## 4. Comandos

Todos los comandos se escriben para Git Bash (sintaxis Bash). No usar sintaxis de PowerShell ni de CMD en documentación, scripts de `package.json` ni instrucciones. Rutas con `/`, el disco C: como `/c/`, y comillas en rutas con paréntesis o corchetes (`"app/(tabs)/index.js"`).

```bash
npm install                 # instalar dependencias
npx expo start              # servidor de desarrollo (QR para Expo Go)
npx expo start --tunnel     # si la red bloquea la conexión local
npx expo start -c           # limpiar caché de Metro
npx expo lint               # ESLint
npm test                    # Jest
npx expo install --check    # compatibilidad de versiones con el SDK
eas build -p android --profile preview   # APK
```

## 5. Estructura obligatoria

La del documento base (sección 15.2), en la raíz del repositorio. No existe carpeta `src/`.

```
app/                        rutas de Expo Router (solo pantallas y layouts)
  _layout.js                Stack raíz
  (tabs)/_layout.js         pestañas Inicio, Carta, Admin
  (tabs)/index.js           RF-01, RF-02
  (tabs)/carta.js           RF-07
  (tabs)/admin.js           RF-08, RF-10 a RF-13 (acceso o panel)
  reservar/[mesaId].js      RF-03 a RF-05
  confirmacion.js           RF-06
  gestion/mesa-form.js      RF-09
  gestion/carta.js          RF-14
components/                 MesaCard, SlotButton, PlatoItem... sin acceso a datos
services/                   única capa que habla con Supabase
  supabase.js  reservas.js  mesas.js  horarios.js  platos.js  auth.js
  slots.js  validaciones.js  errores.js      (lógica pura, sin React ni Supabase)
  __tests__/                pruebas Jest
hooks/                      useConsulta y similares
constants/colors.js, constants/dominio.js
assets/  docs/  supabase/schema.sql
```

- Una pantalla nunca importa `supabase` directamente; llama a funciones de `services/`.
- `slots.js`, `validaciones.js` y `errores.js` son funciones puras con pruebas en `services/__tests__/`.
- Los dominios cerrados (zonas, jornadas, categorías, estados, días) viven solo en `constants/dominio.js` y deben coincidir con los `CHECK` de `schema.sql`.
- Importaciones con rutas relativas (`../../services/mesas`). No se usa el alias `@/` de la plantilla porque dependía de `tsconfig.json`.

## 6. Convenciones de código

- JavaScript ES6+ con módulos (`import`/`export`). No agregar TypeScript, `tsconfig.json` ni archivos `.ts`/`.tsx`. Las funciones de `services/` llevan un comentario JSDoc breve con la forma de los datos que reciben y devuelven.
- Componentes funcionales con hooks (`useState`, `useEffect`, `useFocusEffect` de expo-router). Sin componentes de clase.
- Estilos con `StyleSheet.create`, colores solo desde `constants/colors.js`. Áreas táctiles de al menos 44 × 44 pt.
- Nombres de dominio en español, iguales a la base de datos: `mesas`, `horarios`, `reservas`, `platos`, `cliente_nombre`. Componentes en PascalCase (`MesaCard`), funciones en camelCase (`listarMesasActivas`).
- Comentarios en español, breves, que expliquen el porqué. Cada archivo de `services/` abre con un comentario que cita los RF que atiende.
- Textos de interfaz en español de Colombia; precios con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.
- Fechas: `fecha` como `YYYY-MM-DD` construida con la fecha local del dispositivo (no `toISOString()`, que convierte a UTC y puede cambiar el día). Horas como `HH:MM`.
- `app.json`: `"orientation": "portrait"`, `"userInterfaceStyle": "light"`, sin `"typedRoutes"`.

## 7. Datos y seguridad (no negociable)

1. `supabase/schema.sql` es la única fuente del esquema. Un cambio de tabla, política o función se hace ahí, se prueba en el SQL Editor y se documenta en el commit. No crear tablas desde el Table Editor sin reflejarlas en el archivo.
2. RLS activo en las cuatro tablas. No desactivarlo nunca, ni "temporalmente".
3. Tablas nuevas necesitan `GRANT` explícito (Supabase dejó de concederlos automáticamente en 2026); sin él la API responde 42501.
4. El cliente anónimo:
   - lee `mesas` activas, `horarios` activos y `platos` disponibles;
   - consulta disponibilidad solo con `supabase.rpc('slots_ocupados', { p_mesa_id, p_fecha })`;
   - solo inserta en `reservas`, y el insert va sin `.select()` encadenado (anon no puede leer reservas; la confirmación se arma con los datos locales).
5. El administrador entra con `supabase.auth.signInWithPassword({ email: process.env.EXPO_PUBLIC_ADMIN_EMAIL, password: clave })`. La pantalla muestra un solo campo "Clave". Prohibido validar el acceso comparando un PIN dentro del código.
6. Variables de entorno permitidas: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key o anon key heredada) y `EXPO_PUBLIC_ADMIN_EMAIL`. Todas quedan dentro del APK. Nunca usar ni escribir en ningún archivo la secret key o la `service_role`. Nunca escribir la clave del administrador en el código, en `.env` ni en logs.
7. `.env` nunca se versiona. `.env.example` lleva los mismos nombres con valores vacíos.
8. Las reservas no se borran desde la app: el admin cambia `estado` a `cancelada` o `completada`. Una mesa con reservas no se borra: se inactiva (error 23503).
9. No registrar en consola nombres ni teléfonos de clientes.

## 8. Reglas de negocio que el código debe respetar

| Regla | En la app | En la BD |
|---|---|---|
| RN-01 sin solape por mesa | grilla + verificación previa con `slots_ocupados` | restricción `reservas_sin_solape` (23P01) |
| RN-02 personas ≤ capacidad | `validaciones.js` | trigger `validar_reserva` |
| RN-03 solo mesas activas | Inicio filtra | trigger |
| RN-04 slot dentro de jornada y alineado | `slots.js` (paso = `duracion_slot`) | trigger; `hora_fin` la calcula la BD |
| RN-05 nada en el pasado | slots pasados en gris | trigger (America/Bogota) |
| RN-09 autorización de datos | casilla obligatoria | `CHECK (acepta_tratamiento_datos)` |

La generación de slots sigue la función de referencia de la guía: para cada horario activo del día, desde `hora_inicio` en pasos de `duracion_slot` mientras `t + duracion_slot <= hora_fin`; un slot está ocupado si se solapa (`inicio < finOcupado && inicioOcupado < fin`) con un rango devuelto por `slots_ocupados`. Con los horarios del documento: 12:30, 13:30, 17:00, 18:00, 19:00, 20:00, 21:00, 22:00.

## 9. Manejo de errores y estados de pantalla

- Toda pantalla que carga datos muestra cuatro estados: cargando, vacío, error con botón "Reintentar", contenido. Nunca pantalla en blanco ni cierre de la app (RNF-09).
- Todo error de Supabase pasa por `errores.traducir(error)`, que cubre como mínimo: `23P01`, `KONYS_CAPACIDAD_EXCEDIDA:n`, `KONYS_MESA_NO_DISPONIBLE`, `KONYS_FECHA_PASADA`, `KONYS_FUERA_DE_HORARIO`, `23505`, `23503`, `42501` y fallo de red. Tabla de mensajes: guía, sección 9.4.
- Los servicios devuelven `{ data, error }` o lanzan errores ya traducidos; la pantalla no interpreta códigos.

## 10. Pruebas

- Lógica pura (`slots.js`, `validaciones.js`, `errores.js`): pruebas Jest obligatorias, casos U-01 a U-03 de la guía.
- Pantallas: pruebas manuales CP-01 a CP-24 de la guía; registrar resultados en `docs/pruebas.md`.
- Un cambio que toca reservas debe volver a ejecutar CP-05, CP-07, CP-08 y CP-09.

## 11. Definición de Hecho

Un cambio está hecho cuando:

- cumple el criterio de aceptación de su RF (guía, sección 7.1);
- corre en Expo Go en un celular real;
- `npx expo lint` y `npm test` pasan;
- no introduce dependencias fuera de la sección 3 ni secretos;
- actualiza la documentación afectada (README, `schema.sql`, guía si cambia una decisión).

## 12. Git

- Conventional Commits en español: `feat(RF-05): validar capacidad antes de confirmar`. Tipos: feat, fix, docs, chore, refactor, test, style.
- Commits atómicos por funcionalidad. El plan de 8 commits de la guía (sección 11) es el mínimo práctico; el documento exige al menos 5, en días distintos, y que cada integrante tenga commits propios.
- Con más de un integrante: ramas `feature/rfNN-descripcion` y Pull Request revisado por otra persona.
- Un agente de IA no hace `git commit`, `git push`, `git push --force` ni reescribe historial sin pedido explícito del integrante responsable. Los commits los firma el integrante que revisó y entiende el cambio.

## 13. Reglas específicas para agentes de IA

1. Leer este archivo y la sección pertinente de la guía antes de cada tarea.
2. Trabajar un RF por vez. Indicar al inicio qué RF atiende y qué archivos tocará.
3. No inventar APIs. Ante duda sobre Expo Router 58 o supabase-js, consultar la documentación oficial vigente; el SDK 58 reorganizó parte de la API de navegación.
4. No ejecutar comandos que afecten servicios externos (crear o borrar proyectos de Supabase, `eas build`, `eas env:set`, `git push`) sin confirmación humana.
5. No modificar `supabase/schema.sql` en lo referente a RLS, GRANT o la restricción `reservas_sin_solape` sin explicar el impacto en seguridad.
6. Al terminar, entregar un resumen de qué se hizo, cómo probarlo (qué CP) y qué quedó pendiente. El equipo debe poder explicar ese código en el video (sección 16 del documento); si un fragmento no es explicable en dos frases, simplificarlo.
7. Si una instrucción contradice este contrato, señalar la contradicción antes de actuar.

## 14. Reglas heredadas de la plantilla de Expo

`create-expo-app` (SDK 58) genera su propio `AGENTS.md`. Este archivo lo reemplaza y conserva sus reglas técnicas:

- Expo cambia APIs en cada SDK; no confiar en lo memorizado. Antes de tocar una API de Expo, EAS o React Native, leer la versión mayor de `expo` en `package.json` y consultar `https://docs.expo.dev/versions/v58.0.0/`, o el índice `https://docs.expo.dev/llms.txt`.
- Rutas solo en `app/`; cada archivo ahí es una pantalla y cada `_layout.js` un navegador. Código que no es ruta va fuera de `app/`. `Link`, `router` y `useLocalSearchParams` se importan de `expo-router`.
- Las carpetas `ios/` y `android/` se generan (Continuous Native Generation): no crearlas ni editarlas a mano; configurar en `app.json` y plugins.
- Expo Go solo trae sus módulos nativos incluidos. Todas las dependencias de la sección 3 funcionan en Expo Go; una librería nativa fuera de esa lista obligaría a un development build y queda prohibida en este proyecto.
- Diagnóstico: `npx expo-doctor` y `npx expo install --fix`.

Particularidades del SDK 58 comprobadas al montar el andamiaje en JavaScript (Jest en verde, bundle Android generado):

- `Tabs` se importa de `expo-router/js-tabs`; `import { Tabs } from 'expo-router'` está marcado como obsoleto. `Stack`, `router`, `useFocusEffect` y `router.dismissAll()` siguen en `expo-router`.
- La plantilla viene en TypeScript dentro de `src/app/`; el proyecto se convirtió a JavaScript con `app/` en la raíz (comandos, bloque D). Expo Router 58 detecta `app/` sin configuración extra.
- Jest se configura con `npm pkg set scripts.test=jest jest.preset=jest-expo`.

Este proyecto usa npm; si apareciera `bun.lock`, la plantilla indica usar `bunx` en lugar de `npx`.

## 15. Documentos de referencia

- `docs/KONYS_PIZA.pdf`: documento base del proyecto.
- `docs/GUIA_METODOLOGICA_KONYS.md`: análisis, decisiones (H-xx, ADR-xx), plan por etapas, trazabilidad y pruebas.
- `docs/COMANDOS_KONYS.txt`: comandos paso a paso.
- `supabase/schema.sql`: esquema, RLS, trigger y función de disponibilidad.
