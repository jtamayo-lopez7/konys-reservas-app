# Edge Functions · Konys Pizza (F3C)

| Función | Qué hace | La usa |
|---|---|---|
| `crear-usuario` | Crea la cuenta de Auth (confirmada, con clave temporal) y su perfil con `debe_cambiar_clave = true`. Si el perfil falla, borra la cuenta. | `services/personal.js` → 14b y 13b |
| `eliminar-usuario` | Borra la cuenta de Auth; el perfil cae en cascada. Nadie se borra a sí mismo y siempre queda un admin general. | `services/personal.js` → 14c |

- Están escritas en **JavaScript** (`index.js`), no en TypeScript, por el contrato del proyecto.
  Deno las ejecuta igual.
- Usan las variables que Supabase inyecta (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`). **No hay que configurar secretos**, y la `service_role` nunca
  está en la app.
- Los permisos de quien llama se revisan con **su propio JWT**, con las mismas funciones que la
  RLS (`puede`, `es_admin_general`). El admin de sede y los roles globales solo los gestiona el
  admin general (D-04).
- Responden `{ error: 'KONYS_...' }`; la app lo traduce con `services/errores.js`.

## Publicar desde el panel de Supabase (sin CLI)

Repetir para cada función y en cada proyecto: **staging** (`rdzbzrekppfgwenftayw`) y
**producción** (`izgszaxwzdryksxijtkn`).

1. Panel del proyecto → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. En el campo **Function name**, abajo del editor, escribir el nombre exacto **antes de
   publicar**: `crear-usuario` (o `eliminar-usuario`). Ese campo fija el *slug* de la URL, y el
   panel propone uno al azar (`bright-worker`, `smart-endpoint`…). Renombrar después solo cambia
   el nombre visible, no la URL. La app llama a `/functions/v1/crear-usuario`; con otro slug
   responde "La gestión de cuentas aún no está publicada en el servidor." (pasó el 2026-11-06 y
   hubo que borrarlas y crearlas de nuevo).
3. Borrar el código de ejemplo y pegar todo el contenido del `index.js` correspondiente.
   Comprobar en la primera línea de comentario que sea la función correcta.
4. **Deploy function** y comprobar que la URL de la lista termine en el nombre exacto.
5. En **Details/Settings** de la función, dejar activa la verificación del JWT ("Verify JWT" /
   "Enforce JWT verification"). Viene activa por defecto.

Con la CLI sería lo mismo: `supabase functions deploy crear-usuario --project-ref <ref>`. Como
la entrada es `index.js`, hay que declarar `entrypoint = "./functions/crear-usuario/index.js"` en
`supabase/config.toml`.

## Probar

1. Entrar como admin general → elegir una sede → tarjeta **Personal** → **+**.
2. Crear un usuario con rol Mesero. El correo puede ser ficticio, porque la cuenta queda
   confirmada sin enviar correo. Anotar la clave temporal.
3. Cerrar sesión y entrar con esa cuenta. Debe pedir crear una clave personal (05e) y después
   mostrar el panel del mesero (05d: Reservas y Mesas).
4. Volver como admin general y eliminar la cuenta (14c).
5. Repetir el paso 2 con el mismo correo: debe responder "Ya existe una cuenta con ese correo.".

Si la app muestra "La gestión de cuentas aún no está publicada en el servidor.", la función no
existe en el proyecto al que apunta `.env`.
