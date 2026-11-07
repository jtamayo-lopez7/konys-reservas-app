-- =====================================================================
-- 001_sedes · Fase F2 (RF-16 sedes, RN-10, RN-11; decisión D-03)
--
-- Qué hace:
--   1. Crea la tabla `sedes` con una sola sede principal ("Sede Cabecera").
--   2. Agrega `sede_id` (NOT NULL) a mesas, horarios, platos y reservas y
--      asigna los datos existentes a la sede principal.
--   3. Los nombres de mesa y las jornadas pasan a ser únicos por sede.
--   4. `validar_reserva` toma la sede de la mesa (ignora la que envíe la app),
--      busca la jornada en los horarios de esa sede y rechaza sedes inactivas.
--   5. Protege la sede principal: no se desactiva, no deja de ser principal
--      y no se elimina, ni desde la app ni con SQL directo (trigger).
--   6. Cada sede nueva recibe sus 14 jornadas con el horario del documento.
--
-- Impacto en seguridad (regla 5 de AGENTS.md):
--   * GRANT: `sedes` → select a anon; select/insert/update/delete a
--     authenticated y service_role (sin GRANT la API responde 42501).
--   * RLS: `sedes` con RLS activo. Anon lee solo sedes activas; el admin
--     (es_admin()) gestiona todas. Las políticas públicas de mesas, horarios
--     y platos ahora exigen además que su sede esté activa: desactivar una
--     sede la oculta al cliente sin borrar datos.
--   * El aislamiento fuerte por sede para el personal llega en F3
--     (002_roles: tiene_privilegio, sede_actual, es_admin_general).
--   * `reservas_sin_solape` no cambia: es por mesa y cada mesa es de una sede.
--   * Borrar una sede con datos falla por las FK (on delete restrict). La
--     eliminación controlada (`eliminar_sede`) se habilita en F4.
-- =====================================================================

-- 1. Tabla sedes -------------------------------------------------------
create table public.sedes (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null unique check (length(trim(nombre)) between 2 and 60),
  direccion    text check (direccion is null or length(direccion) <= 120),
  telefono     text check (telefono is null or length(telefono) <= 30),
  activa       boolean not null default true,
  es_principal boolean not null default false,   -- D-03
  creado_en    timestamptz not null default now(),
  constraint sedes_principal_activa check (not es_principal or activa)
);

-- Solo puede existir una sede principal.
create unique index sedes_una_principal on public.sedes (es_principal) where es_principal;

insert into public.sedes (nombre, direccion, es_principal)
values ('Sede Cabecera', 'Cra. 36 con calle 41, Bucaramanga', true);

-- 2. sede_id en las tablas operativas ----------------------------------
alter table public.mesas    add column sede_id uuid references public.sedes(id) on delete restrict;
alter table public.horarios add column sede_id uuid references public.sedes(id) on delete restrict;
alter table public.platos   add column sede_id uuid references public.sedes(id) on delete restrict;
alter table public.reservas add column sede_id uuid references public.sedes(id) on delete restrict;

update public.mesas    set sede_id = (select id from public.sedes where es_principal);
update public.horarios set sede_id = (select id from public.sedes where es_principal);
update public.platos   set sede_id = (select id from public.sedes where es_principal);
update public.reservas set sede_id = (select id from public.sedes where es_principal);

alter table public.mesas    alter column sede_id set not null;
alter table public.horarios alter column sede_id set not null;
alter table public.platos   alter column sede_id set not null;
alter table public.reservas alter column sede_id set not null;

-- 3. Unicidad por sede e índices ---------------------------------------
alter table public.mesas    drop constraint mesas_nombre_key;
alter table public.mesas    add constraint mesas_sede_nombre_unico unique (sede_id, nombre);
alter table public.horarios drop constraint horarios_dia_jornada_unico;
alter table public.horarios add constraint horarios_sede_dia_jornada_unico unique (sede_id, dia_semana, jornada);

create index platos_sede_idx        on public.platos (sede_id);
create index reservas_sede_fecha_idx on public.reservas (sede_id, fecha);

-- 4. validar_reserva con sede ------------------------------------------
create or replace function public.validar_reserva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mesa     public.mesas%rowtype;
  v_horario  public.horarios%rowtype;
  v_dia      text;
  v_ahora    timestamp := (now() at time zone 'America/Bogota');
begin
  select * into v_mesa from public.mesas where id = new.mesa_id;
  if not found or not v_mesa.activa
     or not exists (select 1 from public.sedes s where s.id = v_mesa.sede_id and s.activa) then
    raise exception 'KONYS_MESA_NO_DISPONIBLE';
  end if;

  if new.num_personas > v_mesa.capacidad then
    raise exception 'KONYS_CAPACIDAD_EXCEDIDA:%', v_mesa.capacidad;
  end if;

  if (new.fecha + new.hora_inicio) < v_ahora then
    raise exception 'KONYS_FECHA_PASADA';
  end if;

  v_dia := (array['lunes','martes','miercoles','jueves','viernes','sabado','domingo'])
             [extract(isodow from new.fecha)::int];

  -- La jornada se busca en los horarios de la sede de la mesa.
  select * into v_horario
  from public.horarios h
  where h.sede_id = v_mesa.sede_id
    and h.dia_semana = v_dia
    and h.activo
    and new.hora_inicio >= h.hora_inicio
    and (new.hora_inicio - h.hora_inicio) + make_interval(mins => h.duracion_slot)
        <= (h.hora_fin - h.hora_inicio)
    and (extract(epoch from (new.hora_inicio - h.hora_inicio))::int
         % (h.duracion_slot * 60)) = 0
  limit 1;

  if not found then
    raise exception 'KONYS_FUERA_DE_HORARIO';
  end if;

  -- El servidor decide sede, hora de fin y estado; se ignora lo que envíe la app.
  new.sede_id  := v_mesa.sede_id;
  new.hora_fin := new.hora_inicio + make_interval(mins => v_horario.duracion_slot);
  new.estado   := 'confirmada';
  return new;
end;
$$;

-- 5. Protección de la sede principal (D-03) ----------------------------
create or replace function public.proteger_sede_principal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.es_principal then raise exception 'KONYS_SEDE_PRINCIPAL'; end if;
    return old;
  end if;
  if old.es_principal and (not new.es_principal or not new.activa) then
    raise exception 'KONYS_SEDE_PRINCIPAL';
  end if;
  return new;
end;
$$;

create trigger sedes_proteger_principal
before update or delete on public.sedes
for each row execute function public.proteger_sede_principal();

-- 6. Jornadas por defecto de cada sede nueva ---------------------------
create or replace function public.crear_horarios_sede()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.horarios (sede_id, dia_semana, jornada, hora_inicio, hora_fin, duracion_slot)
  select new.id, d, j.jornada, j.ini, j.fin, 60
  from unnest(array['lunes','martes','miercoles','jueves','viernes','sabado','domingo']) as d
  cross join (values ('almuerzo', time '12:30', time '14:30'),
                     ('noche',    time '17:00', time '23:00')) as j(jornada, ini, fin);
  return new;
end;
$$;

create trigger sedes_crear_horarios
after insert on public.sedes
for each row execute function public.crear_horarios_sede();

revoke execute on function public.proteger_sede_principal() from public, anon, authenticated;
revoke execute on function public.crear_horarios_sede()     from public, anon, authenticated;

-- 7. GRANT y RLS de sedes ----------------------------------------------
grant select on public.sedes to anon;
grant select, insert, update, delete on public.sedes to authenticated, service_role;

alter table public.sedes enable row level security;

create policy sedes_lectura_publica on public.sedes for select to anon using (activa);
create policy sedes_admin on public.sedes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- 8. Lectura pública solo de sedes activas -----------------------------
drop policy mesas_lectura_publica    on public.mesas;
drop policy horarios_lectura_publica on public.horarios;
drop policy platos_lectura_publica   on public.platos;

create policy mesas_lectura_publica on public.mesas for select to anon
  using (activa and exists (select 1 from public.sedes s where s.id = sede_id and s.activa));
create policy horarios_lectura_publica on public.horarios for select to anon
  using (activo and exists (select 1 from public.sedes s where s.id = sede_id and s.activa));
create policy platos_lectura_publica on public.platos for select to anon
  using (disponible and exists (select 1 from public.sedes s where s.id = sede_id and s.activa));
