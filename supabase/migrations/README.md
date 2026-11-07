# Migraciones de Supabase · Konys Pizza

`supabase/schema.sql` es el **esquema base** (etapas 1–4). No es idempotente: no se vuelve a
ejecutar sobre una base con datos. Todo cambio posterior va en este directorio como una migración
numerada (decisión de la fase F0, 2026-11-06).

## Convenciones

- Nombre: `NNN_descripcion.sql` con tres dígitos y descripción en snake_case, en español.
  - `000_esquema_base`: equivale a `../schema.sql`. Ya está aplicada en staging; en producción se
    ejecutó a mano antes de adoptar migraciones.
  - `001_sedes` (F2): aplicada a mano en producción y staging (2026-11-06), sin registro en el historial.
  - `002_roles` (F3A): escrita el 2026-11-06 y probada en PostgreSQL embebido con
    `../pruebas/banco_roles.mjs` (58 comprobaciones). Aplicada a mano en producción y staging el 2026-11-06, sin registro en el historial.
  - Previstas: `003_pagos.sql` (F4) y `004_calificaciones.sql` (F5). El SQL de referencia está en
    `documentación/FASES_IMPLEMENTACION_IDEAS.md`.
- Cada archivo abre con un comentario que cita la fase y los RF/decisiones que atiende, y explica
  el impacto en RLS, `GRANT` o `reservas_sin_solape` si los toca (regla 5 de `AGENTS.md`).
- Toda tabla nueva lleva `GRANT` explícito para `anon`, `authenticated` y `service_role`, y RLS
  activo. Sin el `GRANT` la API responde 42501.
- Una migración ya aplicada en producción no se edita: se corrige con una migración nueva.

## Entornos

| Entorno | Proyecto Supabase | Uso |
|---|---|---|
| Staging | `konys-reservas-staging` (`rdzbzrekppfgwenftayw`) | Datos de prueba. Toda migración se aplica y prueba aquí primero. |
| Producción | `konys-reservas-app` (`izgszaxwzdryksxijtkn`) | Datos reales. Solo migraciones ya probadas en staging, con confirmación humana. |

## Procedimiento por migración

1. Escribir `NNN_descripcion.sql` en este directorio.
2. Correr el banco local `../pruebas/banco_roles.mjs` (PGlite) y ampliarlo con los casos de la
   migración nueva; no toca ninguna base de Supabase.
3. Aplicarla en **staging** (SQL Editor o `apply_migration` del MCP con el mismo nombre).
4. Probar en staging: acceso anónimo y por rol (`set local role anon` / `authenticated`),
   regresión de reservas (CP-05, CP-07, CP-08, CP-09) y avisos de seguridad del panel.
5. Respaldar producción. El 2026-11-06 se creó el esquema `respaldo_20261106` con copias de
   `mesas`, `horarios`, `reservas` y `platos`. No está expuesto a la API; borrarlo al cerrar F6.
6. Con aprobación del equipo, aplicarla en **producción** con el mismo nombre.
7. Registrar el resultado en `documentación/handoff.md`.

Si se recrea el entorno local o de staging desde cero: aplicar `../schema.sql` (o
`000_esquema_base`) y luego cada migración en orden.
