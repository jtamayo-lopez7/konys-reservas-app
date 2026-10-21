# Konys Pizza: app movil de reservas de mesas

Guia metodologica y plan de desarrollo.

| Campo | Valor |
|---|---|
| Archivo | `docs/GUIA_METODOLOGICA_KONYS.md` |
| Version | 1.2 |
| Fecha | 2026-10-21 |
| Documento base | "KONYS PIZZA. App Movil de Reservas de Mesas. Documento de proyecto" (UNICIENCIA, C. Carrascal), archivo KONYS PIZA.pdf, 31 paginas, carpeta de Drive "KONYS PIZA" |
| Documentos hermanos | `AGENTS.md` (raiz del repositorio): contrato de desarrollo. `docs/COMANDOS_KONYS.txt`: comandos paso a paso. `supabase/schema.sql`: esquema de base de datos probado |
| Regla de prevalencia | Si esta guia y el documento base difieren, manda el documento base salvo en las desviaciones justificadas de la seccion 3. Si `AGENTS.md` y esta guia difieren, se corrige el que este desactualizado y se sube la version |

## Control de cambios

| Version | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-10-21 | Version inicial a partir del documento base. |
| 1.1 | 2026-10-21 | JavaScript y estructura de carpetas del documento (`app/` en la raiz); terminal Git Bash. |
| 1.2 | 2026-10-21 | Formato Markdown (`.md`) para que la guia viva dentro del repositorio. |

## Indice

1. [Proposito y uso de esta guia](#1-proposito-y-uso-de-esta-guia)
2. [Contexto, problema y objetivos](#2-contexto-problema-y-objetivos-sintesis-del-documento-base)
3. [Analisis critico del documento base](#3-analisis-critico-del-documento-base)
4. [Supuestos de trabajo](#4-supuestos-de-trabajo)
5. [Enfoque metodologico](#5-enfoque-metodologico)
6. [Alcance y control de cambios](#6-alcance-y-control-de-cambios)
7. [Requisitos y matriz de trazabilidad](#7-requisitos-y-matriz-de-trazabilidad)
8. [Arquitectura y decisiones tecnicas](#8-arquitectura-y-decisiones-tecnicas)
9. [Modelo de datos y reglas de negocio](#9-modelo-de-datos-y-reglas-de-negocio)
10. [Diseno de interfaz y navegacion](#10-diseno-de-interfaz-y-navegacion)
11. [Plan de trabajo por etapas](#11-plan-de-trabajo-por-etapas)
12. [Plan de pruebas](#12-plan-de-pruebas)
13. [Gestion de configuracion](#13-gestion-de-configuracion-git-github-secretos)
14. [Despliegue](#14-despliegue-supabase-expo-go-eas-build)
15. [Registro de riesgos](#15-registro-de-riesgos)
16. [Entregables y lista de verificacion final](#16-entregables-y-lista-de-verificacion-final)
17. [Guion del video](#17-guion-del-video)
18. [Referencias](#18-referencias)

## 1. Proposito y uso de esta guia

Esta guia convierte el documento base en una linea de accion ejecutable. Vive en la carpeta `docs/` del repositorio y se consulta al iniciar cada etapa. Cada etapa (seccion 11) tiene entradas, actividades, salidas, criterio de aceptacion y commit esperado; una etapa se cierra solo cuando cumple su criterio de aceptacion.

Los comandos concretos estan en `docs/COMANDOS_KONYS.txt`. Las reglas que debe respetar cualquier persona o agente de IA que escriba codigo estan en `AGENTS.md`. El esquema de base de datos listo para ejecutar esta en `supabase/schema.sql`.

## 2. Contexto, problema y objetivos (sintesis del documento base)

### 2.1 Contexto

Segun el documento base (Carrascal, s. f.), Konys Pizza opera en la Cra. 36 con calle 41 de Bucaramanga, en dos jornadas: 12:30 a 2:30 p. m. y 5:00 a 11:00 p. m. Las reservas se toman por llamada, WhatsApp, Instagram o en persona, sin registro digital.

### 2.2 Problemas que la app debe resolver

| Codigo | Problema |
|---|---|
| P1 | Doble reserva de una misma mesa y franja. |
| P2 | El cliente no ve la disponibilidad desde su casa. |
| P3 | Carga operativa del administrador en horas pico. |
| P4 | Perdida de clientes que intentan reservar fuera de horario. |
| P5 | Ausencia de historial de reservas. |

### 2.3 Objetivo general

App movil multiplataforma (Android e iOS) en React Native y Expo para que el cliente reserve mesa de forma autonoma con disponibilidad en tiempo real, y para que el administrador gestione mesas, horarios, reservas y carta.

### 2.4 Objetivos especificos (OE) y su verificacion

| OE | Objetivo | Se verifica con |
|---|---|---|
| OE-1 | Interfaz para ver y elegir mesas | RF-01, RF-02 |
| OE-2 | Elegir fecha, hora y personas y confirmar | RF-03, RF-05, RF-06 |
| OE-3 | Disponibilidad por franja | RF-04 |
| OE-4 | Panel del administrador | RF-08 a RF-14 |
| OE-5 | Persistencia en Supabase | modelo de datos, RNF-04 |
| OE-6 | Distribucion con Expo Go y APK; GitHub con minimo 5 commits | etapa 6, seccion 13 |
| OE-7 | Mockups de baja fidelidad y video | etapas 1 y 6 |

## 3. Analisis critico del documento base

El documento base esta bien delimitado en alcance, actores, requisitos y plan de commits. La revision tecnica encontro vacios e inconsistencias que, si no se resuelven antes de codificar, producen exactamente los fallos que el proyecto quiere eliminar (doble reserva, datos expuestos). Cada hallazgo lleva un codigo para poder citarlo en commits y en el video.

### 3.1 Hallazgos de ingenieria

H-01. Modelo "de colecciones". La seccion 10 habla de colecciones y de bases no relacionales, pero Supabase es PostgreSQL. Resolucion: tablas relacionales con clave foranea (`reservas.mesa_id -> mesas.id`), restricciones CHECK para los dominios cerrados (zona, jornada, categoria, estado) y tipos date/time en vez de texto.

H-02. Condicion de carrera. La seccion 12.2 propone verificar el slot antes de insertar. Esa doble verificacion no es atomica: dos clientes pueden pasar la verificacion en el mismo instante. Resolucion: restriccion de exclusion en PostgreSQL (`reservas_sin_solape`) que rechaza dos reservas confirmadas solapadas en la misma mesa. La app conserva la verificacion previa (para dar un mensaje temprano) y ademas interpreta el error 23P01 como "slot ocupado". Costo adicional: una linea de SQL.

H-03. Seguridad del panel admin. El documento sugiere un PIN dentro de la app. Con un PIN local, todas las peticiones salen con la misma clave anon, y las reglas RLS no pueden distinguir al administrador de un cliente: cualquiera que extraiga la clave del APK (seccion 14.3 del propio documento lo advierte) puede crear, editar o borrar mesas. Esto incumple RNF-05. Resolucion: el administrador inicia sesion con Supabase Auth (un unico usuario, registro publico desactivado, rol "admin" en `app_metadata`). La pantalla conserva la forma del mockup: un solo campo "clave" y boton Ingresar; el correo del administrador va en una variable de entorno. El documento excluye la autenticacion de CLIENTES, no la del administrador ("se autentica con credenciales", seccion 5), asi que no hay ampliacion de alcance.

H-04. Privacidad de las reservas. Para pintar slots ocupados, la app ingenua lee la tabla reservas completa, con nombres y telefonos de otros clientes. Resolucion: el cliente anonimo no puede leer reservas; consulta una funcion `slots_ocupados(mesa, fecha)` que devuelve solo `hora_inicio` y `hora_fin`.

H-05. Paso de los slots. El mockup de la figura 1 muestra horas cada 30 min (12:30, 13:00 ...) mientras RF-11 fija reservas de 60 min. Con paso de 30 y duracion de 60 las reservas se solapan. Resolucion: el paso de la grilla es igual a `duracion_slot`. Con 60 min: almuerzo 12:30 y 13:30; noche 17:00 a 22:00 (6 slots). Si el restaurante quiere mas granularidad, se baja `duracion_slot` a 30 desde Admin > Horarios.

H-06. RNF-01 dice "menos de 3 pasos" y CU-02 tiene once. Resolucion: se mide en pantallas: Inicio -> Reservar -> Confirmacion (3 pantallas, sin pantallas intermedias).

H-07. La seccion 11.2 muestra foto en la carta, pero platos no tiene campo de foto. Resolucion: `platos.foto_url` opcional.

H-08. El mockup de mesas tiene boton "Borrar", pero una mesa con reservas historicas no debe desaparecer (se perderia el historial, problema P5). Resolucion: clave foranea `ON DELETE RESTRICT`; si la mesa tiene reservas, la app ofrece "Inactivar" (RF-13).

H-09. "El cambio se refleja en tiempo real" (12.2, paso 7). Resolucion para el alcance: recarga al enfocar cada pantalla (`useFocusEffect`) y gesto de deslizar para recargar. Supabase Realtime queda como mejora.

H-10. Estructura de carpetas y lenguaje. El documento propone JavaScript con `app/` en la raiz (seccion 15.2). La plantilla vigente de create-expo-app (SDK 58) crea el proyecto en TypeScript con las rutas en `src/app/` (verificado sobre expo-template-default 58.0.25). Resolucion: se respeta el documento. Tras crear el proyecto se mueve `src/app` a `app/`, se renombran los archivos a `.js` y se retira TypeScript (comandos, bloque D). Expo Router 58 detecta `app/` en la raiz sin configuracion adicional.

H-11. .gitignore. El `.gitignore` de la plantilla ignora `.env*.local` pero NO `.env`. Resolucion: agregar la linea `.env` antes del primer commit.

H-12. Variables en EAS Build. EAS Build no recibe archivos ignorados por git, asi que un APK compilado en la nube sale sin las credenciales de Supabase si solo existen en `.env` (Expo, s. f.-a). Resolucion: cargar las variables con `eas env:set` en el entorno preview y declarar `"environment": "preview"` en `eas.json`.

H-13. Permisos de la Data API. Desde el 30 de mayo de 2026 los proyectos nuevos de Supabase no exponen las tablas a la Data API sin GRANT explicito, y el 30 de octubre de 2026 el cambio se extiende a los proyectos existentes (Supabase, 2026). El documento no lo menciona. Resolucion: `schema.sql` incluye los GRANT para anon, authenticated y service_role.

H-14. Nombre de la clave. Supabase muestra hoy una "publishable key" donde antes mostraba "anon key", y su guia rapida para Expo usa la variable `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase, s. f.). Resolucion: se mantiene el nombre del documento, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, y se carga en ella la publishable key (o la anon key heredada). Nunca la secret key ni la service_role.

H-15. AsyncStorage. La guia rapida actual de Supabase usa expo-sqlite como almacen de sesion; el documento pide AsyncStorage. Se conserva AsyncStorage porque el documento lo exige y funciona. Debe instalarse con `npx expo install` para obtener la version compatible con el SDK (2.2.0 para SDK 58; npm instalaria la 3.x).

H-16. Zona horaria. Supabase trabaja en UTC. Resolucion: el servidor valida fechas con America/Bogota; la app trabaja con fecha local del dispositivo y envia fecha (YYYY-MM-DD) y hora (HH:MM) por separado.

H-17. Pruebas. El documento solo preve pruebas manuales. Resolucion: pruebas manuales del documento + pruebas unitarias con Jest (jest-expo) para la logica pura: generacion de slots, validacion del formulario y traduccion de errores. No se exige cobertura minima.

H-18. Ventana de reserva. RF-03 no dice cuantos dias hacia adelante se puede reservar. Supuesto S-04: 14 dias.

H-22. Lo que genera create-expo-app (verificado ejecutandolo el 2026-10-21, create-expo 5.1.5): proyecto TypeScript en `src/app`, un `AGENTS.md` propio, carpetas `.claude/` y `.vscode/`, repositorio git ya iniciado y un commit "Initial commit" firmado con la identidad git del equipo. Resolucion: configurar git `user.name` y `user.email` ANTES de crear el proyecto; reemplazar el `AGENTS.md` de la plantilla por el de este proyecto (que conserva sus reglas tecnicas); el "Initial commit" de la plantilla no cuenta para los 5 minimos.

H-23. Andamiaje verificado (2026-10-21). Se ejecutaron en Bash los bloques C a E de los comandos (proyecto nuevo, conversion a JavaScript con `app/` en la raiz, dependencias) y se agregaron `services/supabase.js`, `services/slots.js` con sus pruebas, `constants/colors.js` y el layout de pestanas Inicio / Carta / Admin. Resultado: Jest 3/3 pruebas en verde y bundle Android generado con `npx expo export` (1367 modulos, incluido el cliente de Supabase). Ajuste que exige el SDK 58: `Tabs` se importa de `'expo-router/js-tabs'`; la importacion desde `'expo-router'` esta marcada como obsoleta.

### 3.2 Hallazgos de proteccion de datos personales

H-19. La reserva recoge nombre y telefono, que son datos personales. La Ley 1581 de 2012 exige que el tratamiento obedezca a una finalidad "informada al Titular" (art. 4, lit. b) y requiere "la autorizacion previa e informada del Titular, la cual debera ser obtenida por cualquier medio que pueda ser objeto de consulta posterior" (art. 9) (Ley 1581, 2012). El documento base no lo contempla. Resolucion: casilla obligatoria "Autorizo el tratamiento de mis datos para gestionar esta reserva" con texto breve de finalidad, y columna `reservas.acepta_tratamiento_datos` (NOT NULL, debe ser true), que deja la autorizacion consultable. Es la unica adicion funcional de esta guia; si el docente la objeta, se retira quitando la casilla y la columna. La politica de tratamiento de datos formal de Konys Pizza es responsabilidad del negocio y queda fuera del alcance del software.

### 3.3 Lectura archivistica (alcance acotado)

H-20. La Ley 594 de 2000 comprende "a la administracion publica en sus diferentes niveles, las entidades privadas que cumplen funciones publicas y los demas organismos regulados por la presente ley" (Ley 594, 2000, art. 2). Una pizzeria privada no entra en ese ambito, por lo que no aplican TRD ni la normativa del AGN a sus reservas. Si aplica, como buena practica, tratar la reserva como registro: no se borra, cambia de estado (confirmada -> cancelada / completada), y conserva su fecha de creacion. Eso atiende P5 (historial) y evita perder evidencia ante un reclamo. La conservacion indefinida de telefonos choca con el principio de finalidad de la Ley 1581: se deja como mejora futura anonimizar `cliente_contacto` de reservas con mas de N meses. Ese choque (conservar evidencia frente a minimizar datos) se resuelve conservando el registro de la reserva y suprimiendo el dato de contacto cuando ya no sirve a la finalidad.

H-21. Documentacion del proyecto. Los documentos de `docs/` llevan version y fecha en la cabecera (como esta guia), y el historial de git sirve de registro de cambios. El documento base es la fuente; esta guia es documento derivado y lo cita.

## 4. Supuestos de trabajo

| Codigo | Supuesto |
|---|---|
| S-01 | El trabajo lo hace un grupo de 1 a 4 integrantes. Si es grupal, cada integrante debe tener commits propios (seccion 15.1 del documento). |
| S-02 | Terminal de trabajo: Git Bash en Windows 10/11, usado como terminal integrada de VS Code. Los comandos son Bash y sirven igual en macOS y Linux. |
| S-03 | Carpeta de trabajo: `/c/Proyectos/konys-reservas-app` (en Windows, `C:\Proyectos\konys-reservas-app`). Se puede cambiar sin afectar el resto. |
| S-04 | Ventana de reserva: hoy + 13 dias (14 dias en el selector). |
| S-05 | El restaurante atiende los 7 dias en ambas jornadas hasta que el administrador desactive dias en Admin > Horarios. El documento no dice que dias abre. |
| S-06 | Precios de la carta: los carga el administrador. `schema.sql` trae platos de prueba con precio 0 marcados como tales. |
| S-07 | Versiones verificadas el 2026-10-21 en el registro de npm y nodejs.org: Expo SDK 58 (expo 58.0.16, React Native 0.88.0, React 19.3.0, expo-router 58.0.24), Node.js 24.22.0 LTS "Krypton" (Expo 58 acepta ^22.13, ^24.3 o >=26; Expo, 2026), @supabase/supabase-js 2.118.0, eas-cli 25.3.0. Antes de iniciar, repetir la verificacion con `node -v` y `npx expo --version`. |
| S-08 | Lenguaje: JavaScript (ES6+), como fija el documento (seccion 9.3). Codigo y comentarios en espanol; los identificadores siguen el documento (mesas, horarios, reservas, platos). |

## 5. Enfoque metodologico

### 5.1 Modelo de proceso

Desarrollo incremental por etapas, tal como lo fija la seccion 13 del documento base, con tres practicas agiles livianas:

- a) Tablero Kanban (GitHub Projects o papel) con columnas Pendiente / En curso / En revision / Hecho. Cada tarjeta es un requisito (RF-xx) o una tarea tecnica (T-xx) y lleva su criterio de aceptacion.
- b) Definicion de Hecho (DoD) comun, seccion 5.3.
- c) Revision al cierre de cada etapa: demo en un celular real, verificacion del criterio de aceptacion y commit de cierre.

Se descarta Scrum completo (sprints, ceremonias, roles) porque el proyecto dura entre 4,5 y 7 semanas y el equipo es pequeno; el costo de las ceremonias supera el beneficio. Esta es una decision de diseno, no una norma.

### 5.2 Roles sugeridos (un integrante puede tener varios)

| Rol | Responsabilidad |
|---|---|
| Lider tecnico | arquitectura, revisiones, integridad de main |
| Desarrollo cliente | pantallas Inicio, Reservar, Confirmacion, Carta |
| Desarrollo admin | acceso, Mesas, Horarios, Reservas, Carta admin |
| Datos y despliegue | Supabase, RLS, EAS Build, README |
| QA y documentacion | casos de prueba, mockups, video |

### 5.3 Definicion de Hecho (aplica a cada requisito)

- [ ] Cumple el criterio de aceptacion de su RF (seccion 7).
- [ ] Probado en Expo Go en un celular real (Android o iOS).
- [ ] Muestra estados de carga, vacio y error (RNF-09).
- [ ] Sin errores ni advertencias rojas en la consola de Metro.
- [ ] `npx expo lint` sin errores.
- [ ] Pruebas unitarias en verde si el cambio toca logica pura.
- [ ] Ningun secreto en el codigo; `.env` fuera del repositorio.
- [ ] Commit con mensaje convencional que cita el RF (ej. `feat(RF-05): ...`).

### 5.4 Calendario relativo (del documento base, seccion 13)

| Etapa | Nombre | Duracion | Semana |
|---|---|---|---|
| 1 | Analisis y diseno | ~1 semana | 1 |
| 2 | Configuracion del entorno | ~2 dias | 2 |
| 3 | Modulo cliente | 1 a 2 semanas | 2 a 3 |
| 4 | Modulo administrador | 1 a 2 semanas | 4 a 5 |
| 5 | Pruebas | 3 a 5 dias | 5 o 6 |
| 6 | Compilacion, video y entrega | 1 a 2 dias | 6 o 7 |

Ajustar a la fecha de entrega fijada por el docente. Los commits deben quedar repartidos en dias distintos (seccion 15.1 del documento).

## 6. Alcance y control de cambios

### 6.1 Dentro del alcance (seccion 4.1 del documento)

Modulo cliente (mesas, seleccion, fecha/hora, confirmacion), modulo administrador (mesas, horarios, reservas, carta), carta digital de solo lectura para el cliente, disponibilidad por franjas, Supabase, mockups, distribucion por Expo Go o APK, GitHub con minimo 5 commits, video, app adaptable a Android e iOS. Se agregan las salvaguardas de la seccion 3 (H-02, H-03, H-04, H-19), que no amplian funciones visibles salvo la casilla de autorizacion de datos.

### 6.2 Fuera del alcance (seccion 4.2 del documento)

Pagos o anticipos, domicilios en linea, version web, publicacion en tiendas, registro de clientes, notificaciones de cualquier tipo, reportes o estadisticas, inventario.

### 6.3 Regla de control de cambios

Toda idea que no este en 6.1 se anota en la tarjeta "Mejoras futuras" del tablero y NO se implementa. Para incorporar algo, el equipo debe (1) citar el requisito u objetivo que lo exige, (2) estimar su costo y (3) dejarlo aprobado por escrito en el tablero o por el docente. Esto es lo que el documento llama prevencion del "scope creep".

## 7. Requisitos y matriz de trazabilidad

### 7.1 Requisitos funcionales con criterio de aceptacion

| RF | Nombre | Criterio de aceptacion |
|---|---|---|
| RF-01 | Visualizacion de mesas | Inicio lista las mesas activas en tarjetas (nombre, zona, capacidad, foto si existe). Con 0 mesas activas muestra "No hay mesas disponibles". |
| RF-02 | Seleccion de mesa | Tocar una tarjeta abre Reservar con la mesa precargada. |
| RF-03 | Eleccion de fecha | Selector horizontal de 14 dias; los dias sin jornada activa aparecen deshabilitados. Hoy viene seleccionado si tiene slots futuros. |
| RF-04 | Horarios disponibles | Grilla agrupada en Almuerzo y Noche. Libre: fondo blanco. Ocupado o pasado: gris y no tocable. Seleccionado: fondo oscuro (#0F2B3D). |
| RF-05 | Reserva | Formulario: nombre (2 a 80 caracteres, obligatorio), personas (1 a capacidad, obligatorio), telefono (opcional, max. 30), casilla de autorizacion de datos (obligatoria, H-19). El boton Confirmar se habilita solo con datos validos. Si el slot se ocupo mientras tanto, aparece "Ese horario acaba de ser reservado, elige otro" y la grilla se recarga. |
| RF-06 | Confirmacion | Pantalla con mesa, zona, fecha, hora, personas y nombre; boton "Volver al inicio" que limpia la pila de navegacion. |
| RF-07 | Carta | Chips Pizzas / Entradas / Postres / Bebidas; lista con nombre, descripcion, precio en formato COP ($ 32.000) y foto opcional. Solo platos disponibles. |
| RF-08 | Acceso admin | Pestana Admin pide la clave; clave erronea muestra aviso; la sesion persiste al cerrar la app (AsyncStorage) y hay boton Cerrar sesion. |
| RF-09 | Registro de mesas | Formulario nombre, zona, capacidad (1 a 20), foto (URL opcional; selector de imagen como mejora). Nombre repetido muestra aviso. |
| RF-10 | Listado de mesas | Lista de todas las mesas con interruptor Activa/Inactiva, Editar y Borrar; boton flotante (+). |
| RF-11 | Gestion de horarios | Siete dias x dos jornadas; editar hora inicio, hora fin, duracion y activo. Validar fin > inicio. |
| RF-12 | Visualizacion de reservas | Filtros Hoy / Manana / Todas y por mesa; tarjeta con cliente, mesa, fecha, hora, personas, estado; acciones Cancelar y Completar. |
| RF-13 | Estado de mesa | El interruptor cambia activa; una mesa inactiva desaparece de Inicio y no admite reservas (validado tambien en el servidor). |
| RF-14 | Gestion de carta | Agregar, editar, ocultar (disponible = false) y eliminar platos. |

### 7.2 Requisitos no funcionales con metodo de verificacion

| RNF | Atributo | Verificacion |
|---|---|---|
| RNF-01 | Usabilidad | Reserva completa en 3 pantallas; prueba con 2 personas ajenas al proyecto, sin instrucciones. |
| RNF-02 | Adaptabilidad | Probar en un celular pequeno (<= 5,5"), uno grande y una tablet o emulador; orientacion vertical bloqueada en `app.json`. |
| RNF-03 | Rendimiento | Cronometrar carga de Inicio y Reservar en 4G: < 3 s. Consultas: medir en la pestana Network del depurador o con `console.time`: < 1 s. |
| RNF-04 | Disponibilidad | Depende de Supabase y Expo; el plan gratuito de Supabase pausa proyectos inactivos, por lo que se debe abrir la app al menos una vez por semana antes de la entrega y el dia previo al video. |
| RNF-05 | Seguridad | HTTPS (lo da Supabase); RLS activo en las 4 tablas; admin con Supabase Auth (H-03); prueba CP-17 y CP-18. |
| RNF-06 | Mantenibilidad | Estructura de la seccion 8.4; ninguna pantalla llama a Supabase directamente, todo pasa por `services/`. |
| RNF-07 | Compatibilidad | Expo Go y APK en Android; Expo Go en iOS. |
| RNF-08 | Escalabilidad | Agregar mesas, zonas o platos sin tocar codigo: zonas y categorias son listas en un unico archivo de constantes + CHECK en SQL (agregar una zona exige cambiar ambos; se documenta). |
| RNF-09 | Conexion | Modo avion: cada pantalla muestra mensaje y boton Reintentar; nunca pantalla en blanco. |

### 7.3 Matriz de trazabilidad

| RF | CU | Pantalla / ruta | Servicio | Prueba |
|---|---|---|---|---|
| RF-01 | CU-01 | `app/(tabs)/index.js` | mesas.listarActivas | CP-01, CP-02 |
| RF-02 | CU-02 | `(tabs)/index.js` -> `reservar/[id]` | - | CP-03 |
| RF-03 | CU-02 | `app/reservar/[mesaId].js` | horarios.listar | CP-04 |
| RF-04 | CU-02 | `app/reservar/[mesaId].js` | slots.generarSlots | CP-05, CP-06, U-01 |
| RF-05 | CU-02 | `app/reservar/[mesaId].js` | reservas.crear | CP-07 a CP-11, U-02 |
| RF-06 | CU-02 | `app/confirmacion.js` | - | CP-12 |
| RF-07 | CU-03 | `app/(tabs)/carta.js` | platos.listar | CP-13 |
| RF-08 | CU-04 | `app/(tabs)/admin.js` | auth.ingresar | CP-14, CP-17 |
| RF-09 | CU-05 | `app/gestion/mesa-form.js` | mesas.crear | CP-15 |
| RF-10 | CU-05 | `app/(tabs)/admin.js` (Mesas) | mesas.listarTodas | CP-15 |
| RF-11 | CU-06 | `app/(tabs)/admin.js` (Horarios) | horarios.actualizar | CP-16 |
| RF-12 | CU-07 | `app/(tabs)/admin.js` (Reservas) | reservas.listar | CP-19 |
| RF-13 | CU-08 | `app/(tabs)/admin.js` (Mesas) | mesas.cambiarEstado | CP-20 |
| RF-14 | - | `app/gestion/carta.js` | platos.* | CP-21 |

Nota: el documento no asigna caso de uso a RF-14; se propone CU-09 "Gestionar carta" (actor Administrador) para cerrar la trazabilidad.

## 8. Arquitectura y decisiones tecnicas

### 8.1 Estilo

Arquitectura en cuatro capas del documento (seccion 9.1): Presentacion (pantallas y componentes) -> Navegacion (Expo Router) -> Logica (servicios y hooks) -> Datos (Supabase). Sin servidor propio. La logica que garantiza integridad (no solape, capacidad, horario, mesa activa) se duplica a proposito en el servidor (PostgreSQL), porque el cliente no es confiable.

### 8.2 Stack (versiones verificadas el 2026-10-21; seccion 4, S-07)

| Tecnologia | Version / instalacion |
|---|---|
| Node.js | 24 LTS (24.22.0 o superior en la rama 24) |
| Expo SDK | 58 (`npx create-expo-app@latest`) |
| React Native / React | 0.88.0 / 19.3.0 (los fija el SDK) |
| JavaScript | ES6+ (documento, seccion 9.3) |
| Expo Router | ~58.0 (lo trae la plantilla) |
| @supabase/supabase-js | 2.x (`npx expo install`) |
| react-native-url-polyfill | 4.x (`npx expo install`) |
| @react-native-async-storage/async-storage | version del SDK (`npx expo install` -> 2.2.0) |
| @react-native-community/netinfo | version del SDK (12.0.1) para RNF-09 |
| @expo/vector-icons | version del SDK, iconos (seccion 11.4) |
| jest-expo + jest | version del SDK, pruebas unitarias |
| eas-cli | 25.x (`npm install -g eas-cli`) |
| Git para Windows / Git Bash | cualquier version reciente; terminal de trabajo |
| GitHub | repositorio y entrega |
| Figma / Excalidraw / papel | mockups |

Regla: toda dependencia nativa o de Expo se instala con `npx expo install`, que elige la version compatible con el SDK. `npm install` solo para herramientas globales (eas-cli).

### 8.3 Registro de decisiones (ADR resumidos)

| ADR | Decision |
|---|---|
| ADR-01 | JavaScript y estructura del documento sobre la plantilla de SDK 58 (H-10). |
| ADR-02 | Restriccion de exclusion para la doble reserva (H-02). |
| ADR-03 | Supabase Auth solo para el administrador (H-03). |
| ADR-04 | Funcion `slots_ocupados` en lugar de lectura directa (H-04). |
| ADR-05 | Paso de slot = `duracion_slot` (H-05). |
| ADR-06 | Recarga al enfocar en lugar de Realtime (H-09). |
| ADR-07 | Sin librerias de calendario: selector de 14 dias con FlatList horizontal (menos dependencias, coincide con el mockup). |
| ADR-08 | Estado local con useState/useEffect, sin Redux ni Zustand (lo pide el documento, seccion 9.1, y el volumen de estado es bajo). |
| ADR-09 | Fotos por URL en la primera version; expo-image-picker + Supabase Storage solo si sobra tiempo en la etapa 4. |

### 8.4 Estructura del repositorio (seccion 15.2 del documento)

```text
konys-reservas-app/
|-- app/                           pantallas (Expo Router)
|   |-- _layout.js                 Stack raiz
|   |-- (tabs)/
|   |   |-- _layout.js             pestanas Inicio, Carta, Admin
|   |   |-- index.js               Inicio (mesas)            RF-01, RF-02
|   |   |-- carta.js               Carta                     RF-07
|   |   `-- admin.js               Acceso y panel admin      RF-08, 10-13
|   |-- reservar/
|   |   `-- [mesaId].js            Reservar mesa             RF-03 a RF-05
|   |-- confirmacion.js            Confirmacion              RF-06
|   `-- gestion/                   pantallas admin en pila (adicion)
|       |-- mesa-form.js           Nueva / editar mesa       RF-09
|       `-- carta.js               Carta (admin)             RF-14
|-- components/                    MesaCard, SlotButton, PlatoItem,
|                                  SelectorFecha, EstadoPantalla, Boton
|-- services/
|   |-- supabase.js                cliente de Supabase
|   |-- reservas.js                logica de reservas
|   |-- slots.js                   generacion de slots (logica pura)
|   |-- mesas.js  horarios.js  platos.js  auth.js
|   |-- validaciones.js            validacion del formulario (pura)
|   |-- errores.js                 traduccion de errores a mensajes
|   `-- __tests__/                 pruebas Jest
|-- hooks/                         useConsulta (carga/error/reintento)
|-- constants/
|   |-- colors.js                  paleta (seccion 11.4 del documento)
|   `-- dominio.js                 zonas, jornadas, categorias, dias
|-- assets/                        logo, icono, splash
|-- docs/                          documento base, guia, comandos, mockups
|-- supabase/
|   `-- schema.sql
|-- AGENTS.md                      contrato de desarrollo
|-- .env.example
|-- .gitignore                     incluye .env
|-- app.json
|-- eas.json
`-- README.md
```

Respecto de la seccion 15.2 del documento se agregan `app/gestion/` (las pantallas de formulario de mesa y carta admin no tenian ubicacion), los servicios por tabla, `hooks/`, `supabase/` y `AGENTS.md`. Lo demas coincide nombre por nombre.

### 8.5 Cliente de Supabase (`services/supabase.js`)

```js
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en el archivo .env');
}

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renovar el token solo con la app en primer plano.
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
```

### 8.6 Flujo de reserva (secuencia)

1. Reservar carga mesa, horarios activos y `slots_ocupados(mesa, fecha)`.
2. `slots.generarSlots(fecha, horarios, ocupados, ahora)` arma la grilla.
3. Al confirmar: `validaciones.validarReserva(form, capacidad)`.
4. Verificacion previa: se vuelve a llamar `slots_ocupados` (documento, seccion 12.1 paso 10). Si esta ocupado -> mensaje y recarga.
5. INSERT en reservas SIN encadenar `.select()` (el rol anon no puede leer reservas; pedir la fila de vuelta provoca error de RLS).
6. Si el INSERT falla con 23P01 -> "slot ocupado"; con `KONYS_*` -> mensaje de `errores.js`; sin red -> mensaje de conexion.
7. Exito -> `router.replace('/confirmacion', datos locales de la reserva)`.

## 9. Modelo de datos y reglas de negocio

### 9.1 Tablas (detalle completo en `supabase/schema.sql`)

| Tabla | Columnas |
|---|---|
| mesas | id, nombre (unico), zona (terraza\|salon), capacidad (1-20), activa, foto_url, creado_en |
| horarios | id, dia_semana (lunes..domingo, sin tildes), jornada (almuerzo\|noche), hora_inicio, hora_fin, duracion_slot (min), activo; unico por (dia_semana, jornada) |
| reservas | id, mesa_id -> mesas, cliente_nombre, cliente_contacto, num_personas, fecha, hora_inicio, hora_fin, estado (confirmada\|cancelada\|completada), acepta_tratamiento_datos, creado_en |
| platos | id, nombre, categoria (pizzas\|entradas\|postres\|bebidas), descripcion, precio (COP entero), disponible, foto_url, creado_en |

### 9.2 Reglas de negocio (RN) y donde se hacen cumplir

| RN | Regla | Donde se cumple |
|---|---|---|
| RN-01 | Una mesa no admite dos reservas confirmadas solapadas. | App: grilla + verificacion previa. BD: `reservas_sin_solape`. |
| RN-02 | num_personas <= capacidad de la mesa. | App: `validaciones.js`. BD: trigger `validar_reserva`. |
| RN-03 | Solo mesas activas reciben reservas. | App: Inicio solo lista activas. BD: trigger. |
| RN-04 | El slot debe caer en una jornada activa del dia y estar alineado con duracion_slot. | BD: trigger. La hora_fin la calcula el servidor. |
| RN-05 | No se reserva en el pasado (hora de Bogota). | App: slots pasados en gris. BD: trigger. |
| RN-06 | Las reservas no se borran desde la app; cambian de estado (H-20). | App y RLS. |
| RN-07 | Una mesa con reservas no se borra; se inactiva (H-08). | BD: `ON DELETE RESTRICT`. |
| RN-08 | El cliente anonimo no lee reservas ajenas (H-04). | BD: RLS + `slots_ocupados`. |
| RN-09 | Toda reserva lleva autorizacion de datos (H-19). | App: casilla. BD: CHECK. |

### 9.3 Permisos efectivos (probados en PostgreSQL 16 el 2026-10-21)

| Rol | mesas | horarios | platos | reservas |
|---|---|---|---|---|
| anon | leer activas | leer activos | leer disponibles | solo insertar |
| authenticated (admin) | todo | todo | todo | todo |
| authenticated (no admin) | nada | nada | nada | nada |

Resultados de la prueba local del esquema: reserva valida aceptada; misma mesa y hora rechazada (23P01); 19:30 rechazada (desalineada); 6 personas en mesa de 4 rechazada; fecha pasada rechazada; 23:00 rechazada (fuera de jornada); sin autorizacion rechazada; anon no puede leer ni modificar reservas ni mesas; usuario autenticado sin rol admin no ve filas; el admin cancela una reserva y el slot queda libre; borrar mesa con reservas rechazado (23503); mesa inactiva rechazada.

### 9.4 Mapa de errores para `errores.js`

| Codigo / mensaje | Texto para el usuario |
|---|---|
| 23P01 | Ese horario acaba de ser reservado. Elige otro. |
| KONYS_CAPACIDAD_EXCEDIDA:n | Esta mesa admite maximo n personas. |
| KONYS_MESA_NO_DISPONIBLE | La mesa ya no esta disponible. |
| KONYS_FECHA_PASADA | Ese horario ya paso. |
| KONYS_FUERA_DE_HORARIO | Ese horario no esta habilitado. |
| 23505 (mesas.nombre) | Ya existe una mesa con ese nombre. |
| 23503 | La mesa tiene reservas; inactivala en su lugar. |
| 42501 | Permiso denegado (revisar GRANT/RLS o sesion). |
| TypeError: Network request failed / sin conexion | Sin conexion a internet. Revisa tu red y vuelve a intentar. |

## 10. Diseno de interfaz y navegacion

### 10.1 Mapa de navegacion (figura 4 del documento)

```text
Stack raiz
 |-- (tabs)
 |    |-- Inicio ---- toca mesa ----> reservar/[mesaId] --> confirmacion
 |    |-- Carta
 |    `-- Admin
 |         |-- Acceso (clave)  --ok--> Panel [Mesas | Horarios | Reservas]
 |         |                             |-- (+) / Editar --> gestion/mesa-form
 |         |                             `-- boton Carta --> gestion/carta
 `-- confirmacion: "Volver al inicio" hace router.dismissAll() o
     router.replace('/') para no dejar la reserva en la pila.
```

### 10.2 Pantallas (seccion 11 del documento)

| Pantalla | Contenido |
|---|---|
| Inicio | encabezado Konys Pizza + eslogan, horarios de atencion, FlatList de MesaCard. Boton "Reservar mesa" lleva a la primera mesa activa o hace scroll a la lista. |
| Reservar | SelectorFecha (14 dias), grilla de SlotButton por jornada, formulario, resumen y "Confirmar reserva". Envolver en KeyboardAvoidingView y ScrollView. |
| Confirmacion | datos de la reserva y "Volver al inicio". |
| Carta | chips de categoria y FlatList de PlatoItem. |
| Admin acceso | campo clave (secureTextEntry) e Ingresar. |
| Admin panel | control segmentado Mesas / Horarios / Reservas y boton Carta en la barra superior; Cerrar sesion. |

### 10.3 Guia visual (seccion 11.4 del documento)

Primario #0F2B3D (azul petroleo), acento #F28C28 (naranja), fondo blanco o #F5F6F7, ocupado #C9CDD2, texto #1B1B1B. Tipografia del sistema o Poppins con expo-font. Iconos @expo/vector-icons (Ionicons). Areas tactiles minimas de 44 x 44 pt. Modo oscuro fuera de alcance: fijar `"userInterfaceStyle": "light"` en `app.json` (la plantilla trae `"automatic"`).

### 10.4 Mockups (entregable de la etapa 1)

Minimo seis pantallas: Inicio, Reservar, Confirmacion, Carta, Acceso admin y una pantalla admin (se recomienda hacer las tres: Mesas, Horarios, Reservas). Formato PNG en `docs/mockups/`, nombrados `01-inicio.png`, `02-reservar.png`, etc. Escala de grises, sin detalle visual.

## 11. Plan de trabajo por etapas

### Etapa 1. Analisis y diseno (~1 semana)

Entradas: documento base, esta guia.

Actividades:

1. Leer el documento base y esta guia; anotar dudas para el docente (en especial H-03 y H-19).
2. Mockups de baja fidelidad de las 6+ pantallas y mapa de navegacion.
3. Revisar `supabase/schema.sql` contra la seccion 10 del documento.
4. Crear el tablero Kanban con una tarjeta por RF y por tarea tecnica.
5. Crear cuenta en GitHub, Expo (expo.dev) y Supabase.
6. Crear el proyecto (comandos, bloque C) y el repositorio en GitHub.

Salidas: `docs/mockups/*.png`, tablero, repositorio con commits 1 y 2.

Aceptacion: los mockups cubren las pantallas minimas; el repositorio existe y tiene README, `.gitignore` con `.env` y `.env.example`.

Commits:

- 1 `chore: proyecto Expo inicial y README`
- 2 `docs: agregar documento de proyecto y mockups`

### Etapa 2. Configuracion del entorno (~2 dias)

Actividades:

1. Instalar Node 24 LTS, Git para Windows (Git Bash), VS Code y Expo Go en el celular.
2. Instalar dependencias del proyecto (comandos, bloque D).
3. Crear el proyecto de Supabase, ejecutar `schema.sql`, crear el usuario admin, asignarle el rol y desactivar el registro publico.
4. Crear `.env` y `.env.example`; crear `services/supabase.js`.
5. Prueba de humo: una pantalla temporal que lista las mesas de prueba.
6. Configurar Jest (jest-expo) y una prueba trivial.

Salidas: app que muestra las 5 mesas de prueba en el celular.

Aceptacion: `npx expo start` abre la app en Expo Go y muestra las mesas; `npm test` pasa.

Commit: puede ir dentro del commit 3 o como `chore: configurar Supabase y Jest`.

### Etapa 3. Modulo cliente (1 a 2 semanas)

Orden recomendado (cada punto cierra con su DoD):

| Paso | Actividad | RF |
|---|---|---|
| 3.1 | `constants/colors.js` y `dominio.js`; componentes base | - |
| 3.2 | Navegacion: Stack raiz + Tabs (Inicio, Carta, Admin con placeholder) | - |
| 3.3 | Inicio con MesaCard y estados de carga/vacio/error | RF-01 |
| 3.4 | `services/slots.js` + pruebas unitarias U-01 | RF-04 |
| 3.5 | Reservar: SelectorFecha, grilla, formulario, validaciones | RF-02 a RF-05 |
| 3.6 | `services/reservas.js` con verificacion previa y `errores.js` | RF-05 |
| 3.7 | Confirmacion | RF-06 |
| 3.8 | Carta | RF-07 |

Aceptacion: CP-01 a CP-13 superados en un celular real.

Commits:

- 3 `feat: navegacion por pestanas y pantalla de inicio con mesas`
- 4 `feat: pantalla de reserva con fecha, jornada y formulario`
- 5 `feat: integracion con Supabase`

### Etapa 4. Modulo administrador (1 a 2 semanas)

| Paso | Actividad | RF |
|---|---|---|
| 4.1 | `services/auth.js` y pantalla de acceso | RF-08 |
| 4.2 | Panel con control segmentado y Cerrar sesion | - |
| 4.3 | Mesas: listado, interruptor, borrar con manejo de 23503 | RF-10, RF-13 |
| 4.4 | `gestion/mesa-form`: crear y editar | RF-09 |
| 4.5 | Horarios: 7 dias x 2 jornadas, edicion y validacion | RF-11 |
| 4.6 | Reservas: filtros, cancelar, completar | RF-12 |
| 4.7 | Carta admin: CRUD y ocultar | RF-14 |

Aceptacion: CP-14 a CP-21 superados.

Commit: 6 `feat: modulo de administracion (mesas, horarios, reservas)`

### Etapa 5. Pruebas (3 a 5 dias)

1. Ejecutar todo el plan de pruebas (seccion 12) en Android y en iOS (o emulador) y registrar resultado en una tabla en `docs/pruebas.md`.
2. Pruebas de tamano de pantalla y modo avion.
3. Prueba de usabilidad con 2 personas externas (RNF-01).
4. Corregir defectos; re-ejecutar los casos fallidos.

Aceptacion: 100 % de casos criticos (marcados *) superados.

Commit: 7 `fix: validacion de doble reserva y ajustes en Android e iOS`

### Etapa 6. Compilacion, video y entrega (1 a 2 dias)

1. `eas build:configure`; perfil preview con buildType apk y environment preview; variables con `eas env:set` (H-12).
2. `eas build -p android --profile preview`; instalar el APK y repetir CP-01, CP-07 y CP-14 en el APK.
3. README final: descripcion, tecnologias, instrucciones (`npm install`, `npx expo start`), enlace del APK o de Expo, enlace del video.
4. Captura de `git log --oneline` con >= 5 commits y fechas.
5. Datos de prueba realistas en Supabase; grabar el video (seccion 17).

Aceptacion: lista de verificacion de la seccion 16 completa.

Commit: 8 `chore: configuracion de EAS Build y enlaces en el README`

## 12. Plan de pruebas

### 12.1 Casos manuales (* = critico)

| Caso | Descripcion |
|---|---|
| CP-01* | Inicio con mesas activas muestra todas sus tarjetas. |
| CP-02 | Sin mesas activas: mensaje "No hay mesas disponibles". |
| CP-03* | Tocar mesa abre Reservar con nombre y capacidad correctos. |
| CP-04 | Dia sin jornadas activas aparece deshabilitado. |
| CP-05* | Slot reservado aparece gris y no responde al toque. |
| CP-06 | Hoy despues de las 18:15: slots 17:00 y 18:00 en gris. |
| CP-07* | Reserva valida -> confirmacion con datos correctos y fila en Supabase (Table Editor). |
| CP-08* | Dos celulares eligen el mismo slot; confirman casi a la vez; el segundo recibe "Ese horario acaba de ser reservado". |
| CP-09* | Personas > capacidad: boton deshabilitado y aviso del maximo. |
| CP-10 | Nombre vacio o de 1 caracter: aviso. |
| CP-11* | Sin marcar autorizacion de datos: no deja confirmar. |
| CP-12 | "Volver al inicio" no permite regresar a la confirmacion con Atras. |
| CP-13 | Carta filtra por categoria; plato oculto no aparece; precio en COP. |
| CP-14* | Clave incorrecta: aviso; clave correcta: panel. Reabrir la app mantiene la sesion; Cerrar sesion la elimina. |
| CP-15 | Crear mesa; nombre repetido muestra aviso; aparece en Inicio. |
| CP-16 | Desactivar el domingo en Horarios: el domingo queda deshabilitado para el cliente. |
| CP-17* | Seguridad: con la app cerrada en admin, desde el SQL Editor con `set role anon` intentar UPDATE en mesas -> permiso denegado. |
| CP-18* | Seguridad: un SELECT a reservas con la clave anon (por ejemplo con curl a `/rest/v1/reservas`) no devuelve datos personales. |
| CP-19 | Filtros Hoy / Manana / Todas; cancelar libera el slot (CP-05 lo muestra libre al recargar). |
| CP-20* | Inactivar mesa: desaparece de Inicio; borrar mesa con reservas muestra "inactivala en su lugar". |
| CP-21 | Carta admin: crear, editar, ocultar, eliminar plato. |
| CP-22* | Modo avion en Inicio, Reservar y Carta: mensaje y Reintentar. |
| CP-23 | Pantalla pequena y tablet: nada cortado; teclado no tapa el boton. |
| CP-24 | APK instalado: CP-01, CP-07 y CP-14 de nuevo. |

### 12.2 Pruebas unitarias (Jest)

| Prueba | Alcance |
|---|---|
| U-01 | `slots.generarSlots`: horarios del documento producen 12:30, 13:30, 17:00 ... 22:00; ocupado marca no disponible; dia inactivo devuelve lista vacia; slots pasados de hoy no disponibles. (La funcion de referencia ya fue probada con Node 22 sobre estos casos.) |
| U-02 | `validaciones.validarReserva`: limites de nombre, personas, telefono y autorizacion. |
| U-03 | `errores.traducir`: cada codigo de la tabla 9.4 produce su mensaje. |

### 12.3 Registro

Tabla en `docs/pruebas.md`: caso, fecha, dispositivo, resultado (OK/Falla), evidencia (captura), defecto asociado.

## 13. Gestion de configuracion (Git, GitHub, secretos)

### 13.1 Repositorio

Nombre `konys-reservas-app`; publico o privado con acceso al docente; rama main protegida por costumbre: nada se sube a main que no corra en el celular.

### 13.2 Ramas (si el grupo tiene 2 o mas personas)

`feature/<rf>-<descripcion>` (ej. `feature/rf05-reserva`), integracion por Pull Request revisado por otro integrante. Con una sola persona se puede trabajar en main.

### 13.3 Mensajes de commit (Conventional Commits, como el documento)

```text
tipo(alcance): descripcion en imperativo y en espanol
tipos: feat, fix, docs, chore, refactor, test, style
ejemplo: feat(RF-05): validar capacidad antes de confirmar la reserva
```

Minimo 5 commits, en dias distintos, cada integrante con commits propios. Se recomiendan los 8 del documento como minimo practico.

### 13.4 Secretos

`.env` (no versionado) con `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` y `EXPO_PUBLIC_ADMIN_EMAIL`. `.env.example` con los mismos nombres y valores vacios. Toda variable `EXPO_PUBLIC_` queda dentro del APK: por eso solo va la clave publica, y la seguridad real descansa en RLS. La clave secreta / service_role nunca sale del panel de Supabase. La clave del administrador no va en ninguna variable.

## 14. Despliegue (Supabase, Expo Go, EAS Build)

### 14.1 Supabase

1. Crear proyecto (region mas cercana disponible, p. ej. Sao Paulo).
2. SQL Editor: ejecutar `supabase/schema.sql` completo.
3. Authentication > Users > Add user: correo del admin + clave; marcar "Auto Confirm User".
4. SQL Editor: el UPDATE de `app_metadata` al final de `schema.sql`.
5. Authentication: desactivar "Allow new users to sign up".
6. Project Settings > API (o API Keys): copiar Project URL y la publishable key (o anon key) al `.env`.

### 14.2 Expo Go (desarrollo)

Celular y computador en la misma red Wi-Fi; `npx expo start`; escanear el QR (Android: desde Expo Go; iOS: con la camara). Si la red bloquea el trafico local: `npx expo start --tunnel`. Comprobar que Expo Go instalado soporta SDK 58; si muestra "incompatible SDK", actualizar Expo Go.

### 14.3 EAS Build (APK)

Perfil preview en `eas.json`:

```json
"preview": {
  "distribution": "internal",
  "environment": "preview",
  "android": { "buildType": "apk" }
}
```

Variables: `eas env:set` por cada `EXPO_PUBLIC_` en el entorno preview, con visibilidad plaintext (son publicas por diseno). Compilar con `eas build -p android --profile preview` y descargar el APK del enlace o del QR que entrega expo.dev (Expo, s. f.-b).

### 14.4 Riesgo de pausa

El plan gratuito de Supabase pausa proyectos sin actividad; reactivarlo desde el panel antes de la sustentacion.

## 15. Registro de riesgos

| ID | Riesgo | Prob. | Impacto | Mitigacion |
|---|---|---|---|---|
| R-01 | Doble reserva por concurrencia | Media | Alto | ADR-02, CP-08 |
| R-02 | Clave anon extraida del APK y usada para alterar datos | Media | Alto | RLS + ADR-03, CP-17/18 |
| R-03 | APK sin variables de entorno | Alta | Alto | H-12, CP-24 |
| R-04 | Tablas sin GRANT (42501) | Alta | Medio | H-13, `schema.sql` |
| R-05 | Incompatibilidad de versiones (npm install en lugar de npx expo install) | Media | Medio | `npx expo install`; `npx expo install --check` |
| R-06 | Expo Go desactualizado frente a SDK 58 | Baja | Medio | actualizar Expo Go |
| R-07 | Red universitaria bloquea Expo Go | Media | Medio | `--tunnel` o datos moviles |
| R-08 | Supabase pausado el dia del video | Media | Alto | 14.4 |
| R-09 | Expansion del alcance | Media | Medio | seccion 6.3 |
| R-10 | Commits concentrados en un dia | Media | Medio | commit al cerrar cada etapa |
| R-11 | Codigo generado por IA que el equipo no sabe explicar en el video | Media | Alto | `AGENTS.md` exige explicacion y revision humana |
| R-12 | Cambios de API en Expo Router 58 | Media | Bajo | consultar docs del SDK 58 |

## 16. Entregables y lista de verificacion final

- [ ] Documento de proyecto completado con mockups del grupo.
- [ ] `docs/mockups` con las 6+ imagenes.
- [ ] Repositorio: >= 5 commits en fechas distintas, README, `.gitignore`, `.env.example`, estructura ordenada, sin secretos.
- [ ] Captura de `git log --oneline` o de la pestana Commits.
- [ ] APK (enlace de expo.dev) o enlace/QR de Expo, conectado a Supabase.
- [ ] Video de 5 a 8 minutos (YouTube no listado o Drive con acceso).
- [ ] Enlaces del APK y del video en el README y en el documento final.
- [ ] Plan de pruebas ejecutado y registrado.

## 17. Guion del video

Seccion 16 del documento, 5 a 8 minutos.

| Tiempo | Contenido |
|---|---|
| 0:00-0:45 | Grupo, Konys Pizza y problema (P1 a P5). |
| 0:45-2:00 | Requisitos, casos de uso, mockups -> pantallas finales. |
| 2:00-4:00 | Demo cliente en celular real: mesas, fecha, jornada, reserva, confirmacion, carta; caso de error de slot ocupado (CP-08). |
| 4:00-5:15 | Demo admin: acceso, registrar mesa, editar horario, ver reservas, inactivar mesa. |
| 5:15-6:30 | Tecnico: carpetas, Expo, Supabase (tablas con datos), RLS y restriccion anti-doble-reserva, como se genero el APK. |
| 6:30-7:30 | GitHub: README e historial; que hizo cada integrante. |
| 7:30-8:00 | Dificultades, aprendizajes, mejoras futuras. |

## 18. Referencias

Carrascal, C. (s. f.). *Konys Pizza: App movil de reservas de mesas. Documento de proyecto* [Documento de curso]. UNICIENCIA.

Expo. (s. f.-a). *Environment variables in EAS*. Expo Documentation. https://docs.expo.dev/eas/environment-variables/

Expo. (s. f.-b). *Build APKs for Android Emulators and devices*. Expo Documentation. https://docs.expo.dev/build-reference/apk/

Expo. (2026). *Expo SDK 58 beta is now available*. Expo Changelog. https://expo.dev/changelog/sdk-58-beta

Ley 594 de 2000. (2000, 14 de julio). Por medio de la cual se dicta la Ley General de Archivos y se dictan otras disposiciones. Congreso de Colombia.

Ley Estatutaria 1581 de 2012. (2012, 17 de octubre). Por la cual se dictan disposiciones generales para la proteccion de datos personales. Congreso de la Republica de Colombia.

Supabase. (s. f.). *Use Supabase with Expo React Native*. Supabase Docs. https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native

Supabase. (2026). *Breaking change: Tables not exposed to Data and GraphQL API automatically*. Supabase Changelog. https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

> Nota: el archivo esta escrito sin tildes para evitar problemas de codificacion en editores y terminales de Windows.
