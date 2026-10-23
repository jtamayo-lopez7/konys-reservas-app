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
npx expo lint
npm test              # tras configurar el script de Jest
npx expo install --check
```

## Variables de entorno

Copiar `.env.example` a `.env` y completar. Nunca versionar `.env`.

## Documentación

- `docs/GUIA_METODOLOGICA_KONYS.md` (requisitos, decisiones, plan por etapas, pruebas)
- `docs/COMANDOS_KONYS.txt`
- `supabase/schema.sql` (esquema, RLS, trigger, disponibilidad)
- `AGENTS.md` (contrato de desarrollo)