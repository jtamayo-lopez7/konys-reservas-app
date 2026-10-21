-- =====================================================================
-- Konys Pizza · App móvil de reservas de mesas
-- Esquema de base de datos para Supabase (PostgreSQL 15 o superior)
-- Archivo: supabase/schema.sql
--
-- Cómo usarlo: Supabase > SQL Editor > New query > pegar todo > Run.
-- Es idempotente solo en la creación de extensiones; si necesita volver
-- a ejecutarlo, borre antes las tablas (ver bloque final comentado).
--
-- Trazabilidad con el documento de proyecto (KONYS PIZA.pdf):
--   sección 10 (modelo de datos), 12.2 (condición de carrera),
--   14.1 (RLS) y RNF-05 (seguridad).
-- Diferencias deliberadas frente al documento:
--   * platos.foto_url (la sección 11.2 muestra foto en la carta y el
--     modelo de datos no la tenía).
--   * reservas.acepta_tratamiento_datos (Ley 1581 de 2012, art. 9).
--   * Restricción de exclusión que impide dos reservas confirmadas
--     solapadas en la misma mesa (reemplaza la "doble verificación"
--     como garantía; la app conserva la verificación previa).
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Función auxiliar: ¿la sesión actual es del administrador?
-- El rol se guarda en app_metadata del usuario (solo editable con SQL o
-- con la service_role, nunca desde la app).
-- ---------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin', false);
$$;

-- ---------------------------------------------------------------------
-- 10.1 mesas
-- ---------------------------------------------------------------------
create table public.mesas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique check (length(trim(nombre)) between 1 and 40),
  zona       text not null check (zona in ('terraza', 'salon')),
  capacidad  smallint not null check (capacidad between 1 and 20),
  activa     boolean not null default true,
  foto_url   text,
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 10.2 horarios (un registro por día y jornada)
-- dia_semana sin tildes para evitar problemas de comparación;
-- la interfaz muestra el nombre con tilde.
-- ---------------------------------------------------------------------
create table public.horarios (
  id             uuid primary key default gen_random_uuid(),
  dia_semana     text not null check (dia_semana in
                   ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
  jornada        text not null check (jornada in ('almuerzo', 'noche')),
  hora_inicio    time not null,
  hora_fin       time not null,
  duracion_slot  smallint not null default 60 check (duracion_slot between 15 and 240),
  activo         boolean not null default true,
  constraint horarios_dia_jornada_unico unique (dia_semana, jornada),
  constraint horarios_rango_valido check (hora_fin > hora_inicio)
);

-- ---------------------------------------------------------------------
-- 10.3 reservas
-- ---------------------------------------------------------------------
create table public.reservas (
  id                        uuid primary key default gen_random_uuid(),
  mesa_id                   uuid not null references public.mesas(id) on delete restrict,
  cliente_nombre            text not null check (length(trim(cliente_nombre)) between 2 and 80),
  cliente_contacto          text check (cliente_contacto is null or length(cliente_contacto) <= 30),
  num_personas              smallint not null check (num_personas >= 1),
  fecha                     date not null,
  hora_inicio               time not null,
  hora_fin                  time not null,
  estado                    text not null default 'confirmada'
                              check (estado in ('confirmada', 'cancelada', 'completada')),
  acepta_tratamiento_datos  boolean not null check (acepta_tratamiento_datos),
  creado_en                 timestamptz not null default now(),
  constraint reservas_rango_valido check (hora_fin > hora_inicio),
  -- Garantía atómica contra la doble reserva (sección 12.2).
  -- Si dos clientes confirman el mismo slot a la vez, el segundo INSERT
  -- falla con SQLSTATE 23P01.
  constraint reservas_sin_solape exclude using gist (
    mesa_id with =,
    tsrange(fecha + hora_inicio, fecha + hora_fin, '[)') with &&
  ) where (estado = 'confirmada')
);

create index reservas_fecha_idx on public.reservas (fecha);

-- ---------------------------------------------------------------------
-- 10.4 platos
-- ---------------------------------------------------------------------
create table public.platos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null check (length(trim(nombre)) between 1 and 80),
  categoria    text not null check (categoria in ('pizzas', 'entradas', 'postres', 'bebidas')),
  descripcion  text,
  precio       integer not null check (precio >= 0),   -- COP, sin decimales
  disponible   boolean not null default true,
  foto_url     text,
  creado_en    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Regla de negocio en el servidor: validar cada reserva nueva.
-- Corre con privilegios del dueño (security definer) para poder leer la
-- mesa y el horario aunque el cliente anónimo no vea filas inactivas.
-- Los mensajes empiezan por KONYS_ para que la app los traduzca.
-- ---------------------------------------------------------------------
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
  if not found or not v_mesa.activa then
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

  -- El slot debe caer dentro de una jornada activa de ese día y estar
  -- alineado con la duración configurada. Se compara con intervalos
  -- porque time + interval da la vuelta a medianoche (23:00 + 1 h = 00:00).
  select * into v_horario
  from public.horarios h
  where h.dia_semana = v_dia
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

  -- La hora de fin la calcula el servidor; se ignora la que envíe la app.
  new.hora_fin := new.hora_inicio + make_interval(mins => v_horario.duracion_slot);
  new.estado   := 'confirmada';
  return new;
end;
$$;

create trigger reservas_validar
before insert on public.reservas
for each row execute function public.validar_reserva();

-- ---------------------------------------------------------------------
-- Consulta pública de disponibilidad sin exponer datos personales.
-- Devuelve solo los rangos ocupados de una mesa en una fecha.
-- ---------------------------------------------------------------------
create or replace function public.slots_ocupados(p_mesa_id uuid, p_fecha date)
returns table (hora_inicio time, hora_fin time)
language sql
stable
security definer
set search_path = ''
as $$
  select r.hora_inicio, r.hora_fin
  from public.reservas r
  where r.mesa_id = p_mesa_id
    and r.fecha = p_fecha
    and r.estado = 'confirmada'
  order by r.hora_inicio;
$$;

revoke execute on function public.slots_ocupados(uuid, date) from public;
grant execute on function public.slots_ocupados(uuid, date) to anon, authenticated;
revoke execute on function public.validar_reserva() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Permisos (GRANT). Desde 2026 Supabase ya no expone automáticamente
-- las tablas nuevas a la Data API: sin estos GRANT la app recibe 42501.
-- ---------------------------------------------------------------------
grant select on public.mesas, public.horarios, public.platos to anon;
grant insert on public.reservas to anon;
grant select, insert, update, delete
  on public.mesas, public.horarios, public.platos, public.reservas
  to authenticated;
grant select, insert, update, delete
  on public.mesas, public.horarios, public.platos, public.reservas
  to service_role;

-- ---------------------------------------------------------------------
-- Row Level Security (sección 14.1)
-- ---------------------------------------------------------------------
alter table public.mesas    enable row level security;
alter table public.horarios enable row level security;
alter table public.reservas enable row level security;
alter table public.platos   enable row level security;

-- Público (cliente sin autenticación): solo lectura de lo vigente.
create policy mesas_lectura_publica    on public.mesas    for select to anon using (activa);
create policy horarios_lectura_publica on public.horarios for select to anon using (activo);
create policy platos_lectura_publica   on public.platos   for select to anon using (disponible);

-- Público: puede crear reservas, no leerlas, editarlas ni borrarlas.
create policy reservas_insercion_publica on public.reservas
  for insert to anon with check (estado = 'confirmada');

-- Administrador: control total. Un usuario autenticado sin rol admin no
-- obtiene nada.
create policy mesas_admin    on public.mesas    for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy horarios_admin on public.horarios for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy platos_admin   on public.platos   for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy reservas_admin on public.reservas for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------------------------------------------------------------------
-- Datos iniciales
-- Horarios del documento (sección 1.1). Ajuste los días reales de
-- atención desde el panel Admin > Horarios.
-- ---------------------------------------------------------------------
insert into public.horarios (dia_semana, jornada, hora_inicio, hora_fin, duracion_slot)
select d, j.jornada, j.ini, j.fin, 60
from unnest(array['lunes','martes','miercoles','jueves','viernes','sabado','domingo']) as d
cross join (values ('almuerzo', time '12:30', time '14:30'),
                   ('noche',    time '17:00', time '23:00')) as j(jornada, ini, fin);

-- DATOS DE PRUEBA: reemplazar por las mesas reales del local.
insert into public.mesas (nombre, zona, capacidad) values
  ('Mesa 1', 'salon', 2),
  ('Mesa 2', 'salon', 4),
  ('Mesa 3', 'salon', 4),
  ('Mesa 4', 'terraza', 6),
  ('Mesa 5', 'terraza', 8);

-- DATOS DE PRUEBA: nombres tomados de los mockups; los precios son
-- marcadores (0) hasta cargar la carta real desde Admin > Carta.
insert into public.platos (nombre, categoria, descripcion, precio) values
  ('Margarita',     'pizzas', 'Descripción pendiente', 0),
  ('Hawaiana',      'pizzas', 'Descripción pendiente', 0),
  ('Pepperoni',     'pizzas', 'Descripción pendiente', 0),
  ('Cuatro quesos', 'pizzas', 'Descripción pendiente', 0);

-- ---------------------------------------------------------------------
-- Después de crear el usuario administrador en Authentication > Users,
-- ejecute (cambiando el correo):
--
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"rol":"admin"}'
-- where email = 'admin@konyspizza.test';
--
-- Y desactive el registro público: Authentication > Sign In / Providers >
-- "Allow new users to sign up" = OFF.
-- ---------------------------------------------------------------------

-- Para reiniciar el esquema (¡borra datos!):
-- drop table if exists public.reservas, public.platos, public.horarios, public.mesas cascade;
-- drop function if exists public.slots_ocupados(uuid, date), public.validar_reserva(), public.es_admin();
