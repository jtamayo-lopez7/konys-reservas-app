# Konys Pizza · app móvil de reservas de mesas

App móvil (Android e iOS) en React Native + Expo SDK 58 (JavaScript) para que los clientes de Konys Pizza (Bucaramanga) reserven mesa viendo la disponibilidad por franjas, y para que un administrador gestione mesas, horarios, reservas y carta. Backend: Supabase (PostgreSQL), sin servidor propio.

## Tecnologías

- Expo SDK 58 · React Native 0.88 · React 19
- Expo Router · @supabase/supabase-js
- Jest + jest-expo

## Cómo ejecutar

```bash
npm install
npx expo start        # Expo Go (QR)
npx expo start -c     # limpiar caché de Metro
npm run lint         # pantallas, componentes, constantes, hooks y servicios
npm test             # Jest configurado
npx expo install --check
```

## Variables de entorno

Copiar `.env.example` a `.env` y completar. Nunca versionar `.env`.

## Avance

Etapa 3 implementada en código: pestañas Inicio / Carta / Admin (provisional),
mesas activas, selector de 14 días, disponibilidad por jornada, formulario validado,
creación de reservas y confirmación. La disponibilidad se consulta mediante
`slots_ocupados`; el cliente no lee reservas y el INSERT no solicita datos de retorno.
La confirmación utiliza datos locales en memoria, sin datos personales en las rutas.

La aceptación de la etapa requiere ejecutar CP-01 a CP-13 en un celular real.
El registro de verificaciones y pruebas pendientes está en `docs/pruebas.md`.
El módulo administrador corresponde a la etapa 4.

## Documentación

- `documentación/GUIA_METODOLOGICA_KONYS.md` (requisitos, decisiones, plan por etapas, pruebas)
- `docs/COMANDOS_KONYS.txt`
- `supabase/schema.sql` (esquema, RLS, trigger, disponibilidad)
- `documentación/AGENTS.md` (contrato de desarrollo)

Las guías y la configuración local de agentes se agrupan en `documentación/`, excluida de Git. Esa carpeta debe estar disponible localmente para consultar las guías.

Al comenzar una sesión con un agente, indicar: «Lee `documentación/AGENTS.md` y `documentación/GUIA_METODOLOGICA_KONYS.md` antes de trabajar; ejecuta los comandos desde la raíz del proyecto». Para Claude, cargar también `documentación/CLAUDE.md`. No asumir la carga automática de las guías o configuraciones trasladadas.

`app/` en la raíz contiene las pantallas de Expo Router; `documentación/` contiene las instrucciones locales. Todas las rutas de código de las guías parten de la raíz que contiene `package.json`.
