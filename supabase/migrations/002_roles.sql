-- =====================================================================
-- 002_roles · Fase F3A (RF de roles y personal; RN-10, RN-12; D-04, D-05,
-- D-06, D-07)
--
-- Requiere 001_sedes.
--
-- Qué hace:
--   1. Crea roles, privilegios, rol_privilegios y perfiles (un usuario de
--      personal = una sede + un rol; el admin general no tiene sede).
--   2. Siembra los 6 roles del sistema, los 15 privilegios (D-05) y la matriz
--      rol → privilegio (15 / 13 / 7 / 5 / 2 / 1).
--   3. Funciones de autorización: tiene_privilegio, sede_actual,
--      es_admin_general y puede(privilegio, sede). Un perfil suspendido, con
--      rol oculto o con la clave temporal sin cambiar (D-07) no obtiene nada.
--   4. Triggers de integridad:
--      * validar_perfil: alcance del rol ↔ sede, un solo admin de sede por
--        sede (D-04) y límites para quien no es admin general (no se edita a
--        sí mismo ni al admin de sede, no cambia sedes ni correos).
--      * proteger_roles / validar_rol_privilegio: el rol admin_general no se
--        toca; admin_sede no se suprime; los privilegios globales solo van en
--        roles de alcance global.
--      * controlar_cambio_reserva: el personal solo cambia `estado`, desde
--        'confirmada', y con el privilegio de esa transición (el mesero
--        completa, no cancela).
--      * controlar_cambio_plato: con solo `carta.disponibilidad` se cambia
--        únicamente `disponible`.
--   5. Reemplaza todas las políticas basadas en es_admin() (app_metadata)
--      por políticas por privilegio y sede, y elimina es_admin().
--   6. Convierte al administrador actual (app_metadata.rol = 'admin') en
--      perfil admin_general, para que la app actual siga funcionando hasta
--      la fase 3B.
--   7. Funciones para la app: mi_sesion() y marcar_clave_cambiada().
--
-- Impacto en seguridad (regla 5 de AGENTS.md):
--   * GRANT: se retiran los privilegios de más que anon tenía por defecto
--     (INSERT/UPDATE/DELETE/TRUNCATE en mesas, horarios, platos y sedes).
--     anon queda con SELECT en mesas, horarios, platos y sedes e INSERT en
--     reservas. authenticated queda con lo que usa cada política (sin
--     DELETE en reservas ni INSERT/DELETE en horarios). Las tablas nuevas no
--     tienen nada para anon.
--   * RLS: el aislamiento por sede del personal lo hace la base con
--     puede(clave, sede_id), no la app. El `with check` usa el sede_id final
--     de la fila, así que no se puede mover un registro a otra sede.
--     La lectura pública (sedes, mesas, horarios y platos activos) y la
--     inserción pública de reservas pasan a valer también para
--     authenticated: un miembro del personal con sesión abierta ve y reserva
--     como cualquier cliente, sin obtener nada adicional.
--   * Reservas en el local (D-06): política de INSERT con reservas.gestionar
--     en la sede de la mesa. validar_reserva fija sede_id antes de que RLS
--     evalúe el `with check`, así que la sede no se puede falsear.
--   * Las reservas siguen sin DELETE (RN-06). `reservas_sin_solape` no
--     cambia.
--   * Altas y bajas de cuentas: solo Edge Functions con service_role (3C).
--     No hay política de INSERT ni DELETE en perfiles para authenticated.
-- =====================================================================

-- 1. Tablas ------------------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique check (codigo ~ '^[a-z][a-z0-9_]{2,29}$'),
  nombre      text not null check (length(trim(nombre)) between 2 and 60),
  descripcion text check (descripcion is null or length(descripcion) <= 200),
  alcance     text not null check (alcance in ('global', 'sede')),
  es_sistema  boolean not null default false,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table public.privilegios (
  clave       text primary key,
  descripcion text not null,
  alcance     text not null default 'sede' check (alcance in ('global', 'sede'))
);

create table public.rol_privilegios (
  rol_id        uuid not null references public.roles(id) on delete cascade,
  privilegio_id text not null references public.privilegios(clave) on delete cascade,
  primary key (rol_id, privilegio_id)
);

create table public.perfiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  nombre             text not null check (length(trim(nombre)) between 2 and 80),
  email              text not null unique,
  rol_id             uuid not null references public.roles(id) on delete restrict,
  sede_id            uuid references public.sedes(id) on delete restrict,  -- null en roles globales
  activo             boolean not null default true,
  debe_cambiar_clave boolean not null default true,                        -- D-07
  creado_en          timestamptz not null default now()
);

create index perfiles_sede_idx on public.perfiles (sede_id);
create index perfiles_rol_idx  on public.perfiles (rol_id);

-- 2. Semillas ----------------------------------------------------------
insert into public.roles (codigo, nombre, descripcion, alcance, es_sistema) values
  ('admin_general', 'Administrador general', 'Dueño o gerente de la franquicia. Todas las sedes y todos los permisos.', 'global', true),
  ('admin_sede',    'Administrador de sede', 'Gestiona mesas, horarios, reservas, carta y personal de su sede.', 'sede', true),
  ('recepcion',     'Recepción / anfitrión', 'Recibe clientes, registra y gestiona reservas.', 'sede', true),
  ('mesero',        'Mesero', 'Consulta reservas y mesas y marca reservas como completadas.', 'sede', true),
  ('jefe_cocina',   'Jefe de cocina', 'Crea, edita y elimina platos de la carta de su sede.', 'sede', true),
  ('cocina',        'Auxiliar de cocina', 'Marca platos como disponibles o agotados.', 'sede', true);

insert into public.privilegios (clave, descripcion, alcance) values
  ('sedes.gestionar',       'Gestionar sedes (global)', 'global'),
  ('roles.gestionar',       'Gestionar roles y permisos (global)', 'global'),
  ('usuarios.gestionar',    'Crear, editar, suspender o eliminar usuarios', 'sede'),
  ('mesas.ver',             'Ver mesas', 'sede'),
  ('mesas.gestionar',       'Crear, editar o eliminar mesas', 'sede'),
  ('horarios.gestionar',    'Editar horarios y jornadas', 'sede'),
  ('reservas.ver',          'Ver reservas', 'sede'),
  ('reservas.gestionar',    'Registrar reservas en el local, editarlas o cancelarlas', 'sede'),
  ('reservas.completar',    'Marcar reservas como completadas', 'sede'),
  ('reservas.liberar',      'Marcar "No asistió" y liberar la mesa (10 min)', 'sede'),
  ('carta.gestionar',       'Crear, editar o eliminar platos', 'sede'),
  ('carta.disponibilidad',  'Marcar plato disponible o agotado', 'sede'),
  ('pagos.ver',             'Ver si la reserva tiene pago reportado', 'sede'),
  ('pagos.gestionar',       'Gestionar llaves y cuentas de pago', 'sede'),
  ('calificaciones.ver',    'Ver calificaciones de la sede', 'sede');

insert into public.rol_privilegios (rol_id, privilegio_id)
select r.id, p.clave
from public.roles r
cross join public.privilegios p
where r.codigo = 'admin_general'
   or (r.codigo = 'admin_sede' and p.alcance = 'sede')
   or (r.codigo = 'recepcion' and p.clave in ('mesas.ver', 'reservas.ver', 'reservas.gestionar',
        'reservas.completar', 'reservas.liberar', 'pagos.ver', 'calificaciones.ver'))
   or (r.codigo = 'mesero' and p.clave in ('mesas.ver', 'reservas.ver', 'reservas.completar',
        'reservas.liberar', 'pagos.ver'))
   or (r.codigo = 'jefe_cocina' and p.clave in ('carta.gestionar', 'carta.disponibilidad'))
   or (r.codigo = 'cocina' and p.clave = 'carta.disponibilidad');

-- 3. Funciones de autorización -----------------------------------------
-- Un perfil cuenta solo si está activo, su rol está activo y ya cambió la
-- clave temporal (D-07).
create or replace function public.tiene_privilegio(p_clave text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    join public.roles r on r.id = p.rol_id
    join public.rol_privilegios rp on rp.rol_id = r.id
    where p.id = auth.uid() and p.activo and r.activo and not p.debe_cambiar_clave
      and rp.privilegio_id = p_clave
  );
$$;

create or replace function public.sede_actual()
returns uuid language sql stable security definer set search_path = ''
as $$
  select p.sede_id
  from public.perfiles p
  join public.roles r on r.id = p.rol_id
  where p.id = auth.uid() and p.activo and r.activo and not p.debe_cambiar_clave;
$$;

create or replace function public.es_admin_general()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    join public.roles r on r.id = p.rol_id
    where p.id = auth.uid() and p.activo and not p.debe_cambiar_clave
      and r.codigo = 'admin_general'
  );
$$;

-- ¿Puede la sesión ejercer un privilegio sobre una sede? El admin general,
-- en todas; el resto, solo en la sede de su perfil.
create or replace function public.puede(p_clave text, p_sede uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.es_admin_general()
      or (p_sede is not null
          and p_sede = public.sede_actual()
          and public.tiene_privilegio(p_clave));
$$;

-- 4. Triggers de integridad --------------------------------------------
-- auth.uid() es null en el SQL Editor y en las Edge Functions con
-- service_role: ahí no se aplican los límites de la app.

create or replace function public.validar_perfil()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_rol      public.roles%rowtype;
  v_rol_old  public.roles%rowtype;
begin
  select * into v_rol from public.roles where id = new.rol_id;

  if v_rol.alcance = 'global' and new.sede_id is not null then
    raise exception 'KONYS_PERFIL_SEDE';
  end if;
  if v_rol.alcance = 'sede' and new.sede_id is null then
    raise exception 'KONYS_PERFIL_SEDE';
  end if;

  -- D-04: un solo administrador de sede por sede. El candado serializa
  -- altas simultáneas en la misma sede.
  if v_rol.codigo = 'admin_sede' then
    perform pg_advisory_xact_lock(hashtext('admin_sede:' || new.sede_id::text));
    if exists (
      select 1 from public.perfiles p join public.roles r on r.id = p.rol_id
      where r.codigo = 'admin_sede' and p.sede_id = new.sede_id and p.id <> new.id
    ) then
      raise exception 'KONYS_ADMIN_SEDE_EXISTE';
    end if;
  end if;

  if tg_op = 'INSERT' or auth.uid() is null then
    return new;
  end if;

  -- Desde aquí: UPDATE hecho desde la app.
  if new.id <> old.id or new.email <> old.email or new.creado_en <> old.creado_en then
    raise exception 'KONYS_SIN_PRIVILEGIO';
  end if;

  -- Nadie se edita a sí mismo por la API, salvo apagar la marca de clave
  -- temporal (marcar_clave_cambiada).
  if new.id = auth.uid()
     and (to_jsonb(new) - 'debe_cambiar_clave') <> (to_jsonb(old) - 'debe_cambiar_clave') then
    raise exception 'KONYS_SIN_PRIVILEGIO';
  end if;
  if new.id = auth.uid() then
    return new;
  end if;

  -- Quien gestiona usuarios de una sede solo cambia nombre, activo y rol de
  -- su personal, sin tocar al admin de sede ni asignar ese rol.
  if not public.es_admin_general() then
    select * into v_rol_old from public.roles where id = old.rol_id;
    if new.sede_id is distinct from old.sede_id
       or new.debe_cambiar_clave <> old.debe_cambiar_clave
       or v_rol.alcance <> 'sede'
       or v_rol_old.codigo = 'admin_sede'
       or v_rol.codigo = 'admin_sede' then
      raise exception 'KONYS_SIN_PRIVILEGIO';
    end if;
  end if;

  return new;
end;
$$;

create trigger perfiles_validar
before insert or update on public.perfiles
for each row execute function public.validar_perfil();

create or replace function public.proteger_roles()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    if old.codigo in ('admin_general', 'admin_sede') then
      raise exception 'KONYS_ROL_PROTEGIDO';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    new.es_sistema := false;   -- los roles creados desde la app nunca son de sistema
    return new;
  end if;
  -- UPDATE: el alcance no cambia (cuidaría mal los privilegios globales) y
  -- los códigos de sistema los usa la app.
  if old.codigo = 'admin_general'
     or (old.es_sistema and new.codigo <> old.codigo)
     or new.alcance <> old.alcance
     or new.es_sistema <> old.es_sistema then
    raise exception 'KONYS_ROL_PROTEGIDO';
  end if;
  return new;
end;
$$;

create trigger roles_proteger
before insert or update or delete on public.roles
for each row execute function public.proteger_roles();

create or replace function public.validar_rol_privilegio()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_rol_id  uuid;
  v_clave   text;
  v_rol     public.roles%rowtype;
  v_alcance text;
begin
  if tg_op = 'DELETE' then
    v_rol_id := old.rol_id; v_clave := old.privilegio_id;
  else
    v_rol_id := new.rol_id; v_clave := new.privilegio_id;
  end if;
  select * into v_rol from public.roles where id = v_rol_id;
  select alcance into v_alcance from public.privilegios where clave = v_clave;

  if tg_op <> 'DELETE' and v_alcance = 'global' and v_rol.alcance <> 'global' then
    raise exception 'KONYS_PRIVILEGIO_GLOBAL';
  end if;
  -- Al suprimir un rol, sus filas caen en cascada: eso sí se permite (el rol
  -- admin_general no se puede suprimir, lo impide proteger_roles).
  if auth.uid() is not null and v_rol.codigo = 'admin_general' then
    raise exception 'KONYS_ROL_PROTEGIDO';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger rol_privilegios_validar
before insert or update or delete on public.rol_privilegios
for each row execute function public.validar_rol_privilegio();

create or replace function public.controlar_cambio_reserva()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  -- El personal solo cambia el estado (RN-06: tampoco se borran).
  if (to_jsonb(new) - 'estado') <> (to_jsonb(old) - 'estado') then
    raise exception 'KONYS_SIN_PRIVILEGIO';
  end if;
  if new.estado = old.estado then
    return new;
  end if;
  if old.estado <> 'confirmada' then
    raise exception 'KONYS_TRANSICION_INVALIDA';
  end if;
  if new.estado = 'cancelada' and not public.tiene_privilegio('reservas.gestionar') then
    raise exception 'KONYS_SIN_PRIVILEGIO';
  end if;
  if new.estado = 'completada'
     and not (public.tiene_privilegio('reservas.completar')
              or public.tiene_privilegio('reservas.gestionar')) then
    raise exception 'KONYS_SIN_PRIVILEGIO';
  end if;
  return new;
end;
$$;

create trigger reservas_controlar_cambio
before update on public.reservas
for each row execute function public.controlar_cambio_reserva();

create or replace function public.controlar_cambio_plato()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is null or public.puede('carta.gestionar', old.sede_id) then
    return new;
  end if;
  if (to_jsonb(new) - 'disponible') <> (to_jsonb(old) - 'disponible') then
    raise exception 'KONYS_SIN_PRIVILEGIO';
  end if;
  return new;
end;
$$;

create trigger platos_controlar_cambio
before update on public.platos
for each row execute function public.controlar_cambio_plato();

-- 5. Políticas ---------------------------------------------------------
-- Se retiran las basadas en es_admin() (app_metadata) y la propia función.
drop policy mesas_admin    on public.mesas;
drop policy horarios_admin on public.horarios;
drop policy platos_admin   on public.platos;
drop policy reservas_admin on public.reservas;
drop policy sedes_admin    on public.sedes;
drop function public.es_admin();

-- Lectura pública (anon y personal con sesión abierta).
drop policy sedes_lectura_publica      on public.sedes;
drop policy mesas_lectura_publica      on public.mesas;
drop policy horarios_lectura_publica   on public.horarios;
drop policy platos_lectura_publica     on public.platos;
drop policy reservas_insercion_publica on public.reservas;

create policy sedes_lectura_publica on public.sedes for select to anon, authenticated
  using (activa);
create policy mesas_lectura_publica on public.mesas for select to anon, authenticated
  using (activa and exists (select 1 from public.sedes s where s.id = sede_id and s.activa));
create policy horarios_lectura_publica on public.horarios for select to anon, authenticated
  using (activo and exists (select 1 from public.sedes s where s.id = sede_id and s.activa));
create policy platos_lectura_publica on public.platos for select to anon, authenticated
  using (disponible and exists (select 1 from public.sedes s where s.id = sede_id and s.activa));
create policy reservas_insercion_publica on public.reservas for insert to anon, authenticated
  with check (estado = 'confirmada');

-- Sedes
create policy sedes_personal_lectura on public.sedes for select to authenticated
  using (public.es_admin_general() or id = public.sede_actual());
create policy sedes_gestion_insert on public.sedes for insert to authenticated
  with check (public.tiene_privilegio('sedes.gestionar'));
create policy sedes_gestion_update on public.sedes for update to authenticated
  using (public.tiene_privilegio('sedes.gestionar'))
  with check (public.tiene_privilegio('sedes.gestionar'));
create policy sedes_gestion_delete on public.sedes for delete to authenticated
  using (public.tiene_privilegio('sedes.gestionar'));

-- Mesas (recepción las necesita para registrar reservas en el local)
create policy mesas_personal_lectura on public.mesas for select to authenticated
  using (public.puede('mesas.ver', sede_id)
         or public.puede('mesas.gestionar', sede_id)
         or public.puede('reservas.gestionar', sede_id));
create policy mesas_gestion_insert on public.mesas for insert to authenticated
  with check (public.puede('mesas.gestionar', sede_id));
create policy mesas_gestion_update on public.mesas for update to authenticated
  using (public.puede('mesas.gestionar', sede_id))
  with check (public.puede('mesas.gestionar', sede_id));
create policy mesas_gestion_delete on public.mesas for delete to authenticated
  using (public.puede('mesas.gestionar', sede_id));

-- Horarios: los crea el trigger de sedes; el personal solo los edita.
create policy horarios_personal_lectura on public.horarios for select to authenticated
  using (public.es_admin_general() or sede_id = public.sede_actual());
create policy horarios_gestion_update on public.horarios for update to authenticated
  using (public.puede('horarios.gestionar', sede_id))
  with check (public.puede('horarios.gestionar', sede_id));

-- Platos
create policy platos_personal_lectura on public.platos for select to authenticated
  using (public.puede('carta.gestionar', sede_id)
         or public.puede('carta.disponibilidad', sede_id));
create policy platos_gestion_insert on public.platos for insert to authenticated
  with check (public.puede('carta.gestionar', sede_id));
create policy platos_gestion_update on public.platos for update to authenticated
  using (public.puede('carta.gestionar', sede_id) or public.puede('carta.disponibilidad', sede_id))
  with check (public.puede('carta.gestionar', sede_id) or public.puede('carta.disponibilidad', sede_id));
create policy platos_gestion_delete on public.platos for delete to authenticated
  using (public.puede('carta.gestionar', sede_id));

-- Reservas (sin DELETE, RN-06)
create policy reservas_personal_lectura on public.reservas for select to authenticated
  using (public.puede('reservas.ver', sede_id) or public.puede('reservas.gestionar', sede_id));
create policy reservas_en_local on public.reservas for insert to authenticated
  with check (public.puede('reservas.gestionar', sede_id));
create policy reservas_personal_update on public.reservas for update to authenticated
  using (public.puede('reservas.gestionar', sede_id)
         or public.puede('reservas.completar', sede_id)
         or public.puede('reservas.liberar', sede_id))
  with check (public.puede('reservas.gestionar', sede_id)
         or public.puede('reservas.completar', sede_id)
         or public.puede('reservas.liberar', sede_id));

-- Catálogos de roles: los lee cualquier miembro del personal.
alter table public.roles           enable row level security;
alter table public.privilegios     enable row level security;
alter table public.rol_privilegios enable row level security;
alter table public.perfiles        enable row level security;

create policy roles_lectura on public.roles for select to authenticated using (true);
create policy privilegios_lectura on public.privilegios for select to authenticated using (true);
create policy rol_privilegios_lectura on public.rol_privilegios for select to authenticated using (true);

create policy roles_gestion_insert on public.roles for insert to authenticated
  with check (public.tiene_privilegio('roles.gestionar'));
create policy roles_gestion_update on public.roles for update to authenticated
  using (public.tiene_privilegio('roles.gestionar'))
  with check (public.tiene_privilegio('roles.gestionar'));
create policy roles_gestion_delete on public.roles for delete to authenticated
  using (public.tiene_privilegio('roles.gestionar'));
create policy rol_privilegios_gestion_insert on public.rol_privilegios for insert to authenticated
  with check (public.tiene_privilegio('roles.gestionar'));
create policy rol_privilegios_gestion_delete on public.rol_privilegios for delete to authenticated
  using (public.tiene_privilegio('roles.gestionar'));

-- Perfiles: cada uno ve el suyo; el admin general, todos; quien tiene
-- usuarios.gestionar, los de su sede. Altas y bajas solo por Edge Function.
create policy perfiles_lectura on public.perfiles for select to authenticated
  using (id = auth.uid() or public.puede('usuarios.gestionar', sede_id));
create policy perfiles_gestion_update on public.perfiles for update to authenticated
  using (public.puede('usuarios.gestionar', sede_id))
  with check (public.puede('usuarios.gestionar', sede_id));

-- 6. GRANT mínimos -----------------------------------------------------
revoke all on public.mesas, public.horarios, public.platos, public.sedes, public.reservas
  from anon, authenticated;
grant select on public.mesas, public.horarios, public.platos, public.sedes to anon;
grant insert on public.reservas to anon;
grant select, insert, update, delete on public.mesas, public.platos, public.sedes to authenticated;
grant select, update on public.horarios to authenticated;
grant select, insert, update on public.reservas to authenticated;

revoke all on public.roles, public.privilegios, public.rol_privilegios, public.perfiles
  from anon, authenticated;
grant select on public.roles, public.privilegios, public.rol_privilegios, public.perfiles
  to authenticated;
grant insert, update, delete on public.roles to authenticated;
grant insert, delete on public.rol_privilegios to authenticated;
grant update on public.perfiles to authenticated;
grant select, insert, update, delete
  on public.roles, public.privilegios, public.rol_privilegios, public.perfiles
  to service_role;

-- 7. Funciones para la app ---------------------------------------------
-- Perfil, rol, sede y privilegios de la sesión en una sola llamada. Devuelve
-- null si el usuario no tiene perfil. Incluye las marcas de estado para que
-- la app explique por qué no deja entrar (suspendido, rol oculto, clave).
create or replace function public.mi_sesion()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'nombre', p.nombre,
    'email', p.email,
    'activo', p.activo,
    'debe_cambiar_clave', p.debe_cambiar_clave,
    'rol', jsonb_build_object('id', r.id, 'codigo', r.codigo, 'nombre', r.nombre,
                              'alcance', r.alcance, 'activo', r.activo),
    'sede', case when s.id is null then null
                 else jsonb_build_object('id', s.id, 'nombre', s.nombre, 'activa', s.activa) end,
    'privilegios', coalesce((select jsonb_agg(rp.privilegio_id order by rp.privilegio_id)
                             from public.rol_privilegios rp where rp.rol_id = r.id), '[]'::jsonb)
  )
  from public.perfiles p
  join public.roles r on r.id = p.rol_id
  left join public.sedes s on s.id = p.sede_id
  where p.id = auth.uid();
$$;

-- D-07: el propio usuario apaga la marca después de cambiar su clave con
-- supabase.auth.updateUser({ password }).
create or replace function public.marcar_clave_cambiada()
returns void language sql security definer set search_path = ''
as $$ update public.perfiles set debe_cambiar_clave = false where id = auth.uid(); $$;

revoke execute on function public.tiene_privilegio(text)    from public, anon;
revoke execute on function public.sede_actual()             from public, anon;
revoke execute on function public.es_admin_general()        from public, anon;
revoke execute on function public.puede(text, uuid)         from public, anon;
revoke execute on function public.mi_sesion()               from public, anon;
revoke execute on function public.marcar_clave_cambiada()   from public, anon;
grant execute on function public.tiene_privilegio(text)     to authenticated;
grant execute on function public.sede_actual()              to authenticated;
grant execute on function public.es_admin_general()         to authenticated;
grant execute on function public.puede(text, uuid)          to authenticated;
grant execute on function public.mi_sesion()                to authenticated;
grant execute on function public.marcar_clave_cambiada()    to authenticated;

revoke execute on function public.validar_perfil()           from public, anon, authenticated;
revoke execute on function public.proteger_roles()           from public, anon, authenticated;
revoke execute on function public.validar_rol_privilegio()   from public, anon, authenticated;
revoke execute on function public.controlar_cambio_reserva() from public, anon, authenticated;
revoke execute on function public.controlar_cambio_plato()   from public, anon, authenticated;

-- 8. El administrador actual pasa a admin general ----------------------
-- Ya cambió su clave alguna vez: no se le exige clave temporal.
insert into public.perfiles (id, nombre, email, rol_id, sede_id, activo, debe_cambiar_clave)
select u.id, 'Administrador general', u.email,
       (select id from public.roles where codigo = 'admin_general'), null, true, false
from auth.users u
where u.raw_app_meta_data ->> 'rol' = 'admin';
