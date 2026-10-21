# CLAUDE.md · Konys Pizza, app móvil de reservas de mesas

Instrucciones para Claude Code en este repositorio. Claude Code lee este archivo al iniciar cada sesión; el contrato completo de desarrollo está en `AGENTS.md`, que se importa aquí para no duplicarlo. Si este archivo y `AGENTS.md` difieren, manda `AGENTS.md` y se corrige este.

Versión: 1.0 · 2026-10-21

@AGENTS.md

## Contexto rápido

- App React Native + Expo SDK 58, en JavaScript (sin TypeScript), con Expo Router y Supabase.
- Estructura del documento base: `app/` en la raíz, `components/`, `services/`, `hooks/`, `constants/`, `assets/`, `docs/`, `supabase/`. No existe `src/`.
- Documentos: `docs/GUIA_METODOLOGICA_KONYS.md` (decisiones H-xx y ADR-xx, requisitos, pruebas), `docs/COMANDOS_KONYS.txt` (comandos paso a paso), `supabase/schema.sql` (esquema, RLS y reglas de negocio).
- Terminal del equipo: Git Bash en Windows. Todo comando que Claude proponga o escriba en documentación va en sintaxis Bash, con rutas `/c/...` y comillas en rutas con paréntesis o corchetes: `"app/(tabs)/index.js"`, `"app/reservar/[mesaId].js"`.

## Cómo trabajar en cada tarea

1. Identificar el RF de la tarea y leer su fila en la guía (sección 7.1 y matriz 7.3) antes de tocar código.
2. Para cambios de más de un archivo, presentar primero un plan corto: RF, archivos que se crean o modifican, casos de prueba (CP o U) que lo validan. Esperar visto bueno si el cambio toca `supabase/schema.sql`, RLS, autenticación o dependencias.
3. Implementar un RF por vez, siguiendo el orden de la sección 11 de la guía.
4. Verificar antes de dar por terminado:

```bash
npx expo lint
npm test
npx expo install --check
```

5. Cerrar con un resumen: qué se hizo, qué CP debe ejecutar el integrante en el celular y un mensaje de commit sugerido en formato `feat(RF-xx): ...`. No ejecutar `git commit` ni `git push` salvo pedido explícito.

## Lo que Claude no hace en este proyecto

- Instalar dependencias con `npm install <paquete>`; siempre `npx expo install <paquete>`, y solo las de la tabla de `AGENTS.md` sección 3.
- Agregar TypeScript, `tsconfig.json`, archivos `.ts`/`.tsx` o el alias `@/`.
- Importar `supabase` desde una pantalla de `app/` o un componente; el acceso a datos va en `services/`.
- Leer, mostrar o escribir el contenido de `.env`, la secret key o la `service_role`. Si necesita saber qué variables existen, consulta `.env.example`.
- Ejecutar comandos con efectos externos (`eas build`, `eas env:set`, `eas login`, `git push`, cambios en el panel de Supabase) sin confirmación del integrante.
- Implementar funciones fuera del alcance (AGENTS.md sección 2). Se anotan como "Mejoras futuras".

## Consultas de documentación

Expo cambia APIs entre SDK. Ante duda sobre Expo Router, EAS o un módulo de Expo, consultar `https://docs.expo.dev/versions/v58.0.0/` o `https://docs.expo.dev/llms.txt` antes de escribir código. Para Supabase, `https://supabase.com/docs`. Si el proyecto tiene `.claude/settings.json` (la plantilla por defecto de Expo lo crea con el plugin oficial de Expo; la plantilla blank no), conservarlo. El orden de trabajo y los prompts por etapa están en `docs/RUTA_CLAUDE_CODE.md`.

## Explicabilidad

El equipo debe poder explicar cada fragmento en el video de sustentación. Preferir código simple y legible sobre soluciones ingeniosas, comentar el porqué en español y no generar más de lo que pide el RF.
