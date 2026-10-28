# Registro de pruebas · Konys Pizza

Fecha: 2026-10-28. Etapa 3: módulo cliente (RF-01 a RF-07).

## Verificación automática

| Comando / alcance | Resultado |
|---|---|
| `npm test -- --runInBand` | 37 pruebas aprobadas, 5 suites. |
| U-01: generación de slots | Jornadas, solapes parciales, límites contiguos, días inactivos, horas pasadas, duración variable y ventana de 14 días. |
| U-02: formulario | Límites de nombre, personas, teléfono opcional y autorización obligatoria. |
| U-03: traducción de errores | Códigos del esquema, fallos de red y mensaje seguro para errores desconocidos. |
| Servicio de reservas con Supabase simulado | Reconsulta disponibilidad; rechaza solape, capacidad actual excedida, mesa inactiva, fecha fuera de ventana y hora inválida; traduce conflicto 23P01; inserta sin `select`. |
| `npm run lint` | Sin errores ni advertencias. Incluye app, componentes, constantes, hooks y servicios con sus pruebas. |
| Exportación Android con `npx expo export --platform android --output-dir dist/etapa3-android` | Bundle Hermes generado. No equivale a probar el APK ni Expo Go. |

El comando de lint usa ESLint directamente con la configuración de Expo: el
envolvente `expo lint` permanecía abierto después de la revisión en este entorno.
Se declararon los globales de Jest para revisar también las pruebas.

No se modificó el esquema SQL ni se escribieron reservas en Supabase remoto.
Las pruebas de servicio usan respuestas simuladas; no certifican el despliegue
del esquema, las políticas RLS ni la conexión real. La vista previa visual no pudo
revisarse porque no hay un navegador conectado a las herramientas de la sesión.

## Aceptación manual pendiente

Todos estos casos están **pendientes**, sin resultado supuesto. Ejecutarlos con
Expo Go en un celular real y registrar dispositivo, resultado y evidencia.

| Caso | Qué verificar | Estado |
|---|---|---|
| CP-01* | Inicio muestra las tarjetas de todas las mesas activas, nombre, zona, capacidad y foto opcional. | Pendiente |
| CP-02 | Sin mesas activas aparece «No hay mesas disponibles». | Pendiente |
| CP-03* | Tocar mesa abre Reservar con nombre y capacidad correctos. | Pendiente |
| CP-04 | Días sin jornadas activas aparecen deshabilitados en el selector de 14 días. | Pendiente |
| CP-05* | Slot reservado se muestra gris y no se puede tocar. | Pendiente |
| CP-06 | Hoy, después de las 18:15, 17:00 y 18:00 están bloqueados. | Pendiente |
| CP-07* | Reserva válida abre confirmación correcta y crea una fila en Supabase. | Pendiente |
| CP-08* | Dos celulares confirman el mismo slot: solo una reserva se acepta y el segundo ve el aviso con disponibilidad actualizada. | Pendiente |
| CP-09* | Personas por encima de capacidad: aviso y Confirmar deshabilitado. | Pendiente |
| CP-10 | Nombre vacío o de un carácter impide confirmar; un carácter muestra aviso. | Pendiente |
| CP-11* | Sin autorización de datos no se puede confirmar. | Pendiente |
| CP-12 | Volver al inicio y Atrás no reabren confirmación ni formulario enviado. | Pendiente |
| CP-13 | Carta filtra categorías, omite platos ocultos y muestra precios COP. | Pendiente |
| CP-22* | Modo avión en Inicio, Reservar y Carta muestra error y permite Reintentar al recuperar conexión. | Pendiente |
| CP-23 | Pantalla pequeña y tablet: sin cortes; teclado no tapa el formulario ni Confirmar. | Pendiente |

Para cerrar la etapa 2 también falta registrar que Expo Go muestra las cinco
mesas de prueba. La etapa 3 solo se acepta al superar CP-01 a CP-13 en celular;
el módulo administrador y CP-14 a CP-21 corresponden a la etapa 4.

## Preparación de la prueba

1. Configurar `.env` según `.env.example`, sin versionar credenciales.
2. Comprobar que el esquema ya está aplicado en Supabase y contiene datos de prueba.
3. Ejecutar `npm start` y abrir el QR en Expo Go.
4. Recorrer Inicio → Reservar → Confirmación → Inicio y luego Carta.
5. Registrar CP-01 a CP-13 y repetir los críticos CP-05, CP-07, CP-08 y CP-09 tras cualquier ajuste de reservas.

Las pruebas con inserción real y cambios de datos se deben realizar en el
entorno de pruebas autorizado. No volver a ejecutar `schema.sql` sobre tablas
existentes para preparar estos casos: su creación de tablas no es idempotente.
