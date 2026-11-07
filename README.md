# Konys Pizza · App móvil de reservas de mesas

App móvil (Android e iOS) para que los clientes de Konys Pizza (Bucaramanga) reserven mesa
viendo la disponibilidad por franjas, y para que el personal autorizado gestione mesas,
horarios, reservas y carta. Construida con **React Native + Expo SDK 58** en **JavaScript**
(sin TypeScript) y **Supabase** (PostgreSQL) como backend, sin servidor propio.

> **Estado:** etapas 1 a 4 implementadas en código. Falta la aceptación manual en celular real
> (CP-01 a CP-23 y CP-24 sobre el APK), la etapa 5 (pruebas) y la etapa 6 (APK, video y entrega). Las ideas nuevas
> de `docs/FASES_IMPLEMENTACION_IDEAS.md` **son una propuesta y todavía no están implementadas**.
> Para el detalle del estado y los siguientes pasos, ver `documentación/handoff.md`.

---

## 1. Funcionalidades

### Módulo cliente

- **Inicio:** lista las mesas activas con nombre, zona, capacidad y foto opcional.
- **Reservar:** selector de 14 días, disponibilidad agrupada en Almuerzo y Noche, grilla de
  slots (libre / ocupado / pasado), formulario con nombre, personas, teléfono opcional y
  autorización de tratamiento de datos (Ley 1581 de 2012).
- **Confirmación:** resumen de la reserva con datos locales en memoria (sin datos personales
  en la URL ni persistencia).
- **Carta:** filtros por categoría y precios en COP, con platos disponibles.

### Módulo de personal (F3)

- Acceso por la **rueda de ajustes** de la bienvenida, con correo y clave (Supabase Auth). El
  perfil, el rol, la sede y los privilegios salen de la tabla `perfiles` (`002_roles`).
- Clave temporal con cambio obligatorio en el primer ingreso.
- El admin general elige la sede; los demás roles entran al panel de su sede, con una tarjeta
  por sección permitida. La base (RLS) impide lo que el rol no tiene.
- **Mesas:** crear, editar, activar/inactivar y borrar (una mesa con reservas no se borra:
  se inactiva).
- **Horarios:** 7 días x 2 jornadas, con edición de hora inicio, hora fin, duración y activo.
- **Reservas:** filtros Hoy / Mañana / Todas y por mesa; cancelar o completar (no se borran).
- **Carta:** crear, editar, ocultar/mostrar y eliminar platos.

### Seguridad y datos

- RLS activo en las 4 tablas (`mesas`, `horarios`, `platos`, `reservas`).
- El cliente anónimo solo lee datos vigentes y solo inserta reservas; **no puede leer reservas
  ajenas**. La disponibilidad se consulta con la función `slots_ocupados(mesa, fecha)`.
- Restricción de exclusión `reservas_sin_solape` que impide dos reservas confirmadas solapadas
  en la misma mesa (error `23P01`).
- Un trigger valida capacidad, mesa activa, fecha/hora y alineación del slot, y calcula la hora
  de fin en el servidor.
- `.env` nunca se versiona; solo se usa la clave pública (nunca la `service_role`).

---

## 2. Tecnologías

| Tecnología | Versión |
|---|---|
| Expo SDK | ~58.0.21 |
| React Native / React | 0.88.0 / 19.3.0 |
| Expo Router | ~58.0.28 |
| @supabase/supabase-js | ^2.118.0 |
| @react-native-async-storage/async-storage | 2.2.0 |
| @react-native-community/netinfo | 12.0.1 |
| @expo/vector-icons | ^15.0.2 |
| Jest / jest-expo | ~30.5.2 / ~58.0.13 |

Regla del proyecto: toda dependencia de app se instala con `npx expo install <paquete>`.
No usar `npm install` para dependencias de la app.

---

## 3. Estructura del repositorio

```text
konys-reservas-app/
├── app/                    pantallas (Expo Router)
│   ├── (tabs)/             Inicio, Carta y Admin
│   ├── reservar/[mesaId].js
│   ├── confirmacion.js
│   └── gestion/            mesa-form.js, carta.js
├── components/             componentes presentacionales
├── services/               única capa que habla con Supabase
│   └── __tests__/          pruebas Jest
├── hooks/                  ReservaConfirmada, SedeSeleccionada, SesionPersonal
├── constants/              colors.js, dominio.js
├── supabase/
│   ├── schema.sql          esquema, RLS, trigger y disponibilidad
│   └── seed_carta.sql      carga de la carta en una base existente
├── docs/                   mockups y documentación de apoyo
├── assets/                 logo, iconos y splash
├── eas.json                perfil preview (APK)
├── .env.example
└── documentación/          guías locales y handoff.md (excluida de Git)
```

`documentación/` contiene las guías locales y el `handoff.md`; está excluida de Git y no forma
parte del enrutamiento de Expo Router. Las pantallas viven en `app/` en la raíz.

---

## 4. Puesta en marcha

### Requisitos

- Node.js 24 LTS (o la rama que acepte Expo SDK 58).
- Git Bash (Windows) o terminal equivalente.
- Expo Go en el celular.

### Pasos

```bash
npm install
cp .env.example .env
# completar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start
```

Abrir el QR con Expo Go. Si la red bloquea el tráfico local: `npx expo start --tunnel`.

### Base de datos

1. Crear el proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` completo en el SQL Editor. **No es idempotente**: no volver a
   ejecutarlo sobre tablas existentes.
3. Crear el usuario administrador en Authentication y asignarle el rol:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rol":"admin"}'
   where email = 'TU_CORREO';
   ```

4. Desactivar el registro público de usuarios ("Allow new users to sign up" = OFF).
5. Copiar la URL y la clave pública (publishable/anon) al `.env`.
6. Si la base ya existe y solo falta la carta, ejecutar `supabase/seed_carta.sql`.

### Scripts

```bash
npm start            # Expo Go
npm run android      # abrir en Android
npm run ios          # abrir en iOS
npm run lint         # ESLint sobre app, components, constants, hooks y services
npm test             # Jest
npx expo install --check
```

---

## 5. Pruebas

- **Automáticas:** 65 pruebas en 6 suites, en verde (`npm test`).
- **Lint:** sin errores ni advertencias (`npm run lint`).
- **Manuales pendientes:** CP-01 a CP-23 (cliente y administrador) en un celular real, y
  CP-24 sobre el APK. El registro `docs/pruebas.md` no está presente en el estado actual del
  repositorio y debe recrearse con dispositivo, resultado y evidencia.

Los cambios que toquen reservas deben re-ejecutar CP-05, CP-07, CP-08 y CP-09.

---

## 6. Compilación del APK (EAS)

`eas.json` ya define el perfil `preview` (distribución interna, APK Android, entorno
`preview`). Las variables `EXPO_PUBLIC_*` deben cargarse en EAS porque `.env` no se versiona:

```bash
eas login
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "..." --visibility plaintext
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..." --visibility plaintext
eas build -p android --profile preview
```

---

## 7. Documentación

- `documentación/handoff.md`: estado actual, pendientes y siguientes pasos. **Actualizarlo en cada avance.** (Local, excluido de Git.)
- `documentación/GUIA_METODOLOGICA_KONYS.md`: requisitos, decisiones, plan por etapas y pruebas.
- `documentación/AGENTS.md`: contrato de desarrollo (convenciones, seguridad, reglas).
- `docs/FASES_IMPLEMENTACION_IDEAS.md`: plan de las ideas nuevas (sedes, roles, pagos,
  calificaciones). **Propuesta, aún no implementada.**
- `docs/*.png`: mockups de las pantallas.

Las guías de `documentación/` son locales y no se versionan; deben estar disponibles en el
equipo para consultarlas.

---

## 8. Roadmap

| Etapa | Estado |
|---|---|
| 1. Análisis y diseño | Implementada |
| 2. Configuración del entorno | Implementada; falta registrar la verificación en celular |
| 3. Módulo cliente (RF-01 a RF-07) | Implementada en código; aceptación manual pendiente |
| 4. Módulo administrador (RF-08 a RF-14) | Implementada en código; aceptación manual pendiente |
| 5. Pruebas | Pendiente |
| 6. Compilación, video y entrega | Pendiente |
| Ideas nuevas (fases F0–F6: sedes, roles, pagos, calificaciones) | Propuesta en `docs/FASES_IMPLEMENTACION_IDEAS.md`; ninguna fase iniciada |

---

## 9. Autores

Jorge Tamayo y Joan Sanchez. Todos los derechos reservados 2026.

Este proyecto se distribuye con fines académicos; ver `LICENSE`.