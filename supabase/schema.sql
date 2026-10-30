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
  categoria    text not null check (categoria in ('combos', 'pizzas', 'entradas', 'postres', 'bebidas', 'otros')),
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

-- Carta real: 30 productos. Para una base existente, usar seed_carta.sql.
insert into public.platos (nombre, categoria, descripcion, precio, disponible)
select v.nombre, v.categoria, v.descripcion, v.precio, v.disponible
from (values
  ('Combo lasaña personal', 'combos',
   'Deliciosa lasaña artesanal: capas de carne molida jugosa, queso mozzarella, queso parmesano y nuestra salsa napolitana casera, al estilo ikónico que solo Konys sabe hacer. Acompañada de pan de ajo crocante y limonada de panela. Solo disponible en almuerzo.',
   31900, true),

  ('Konys bucara', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, en masa de finas hierbas, salsa napolitana, queso mozzarella, carne Angus beef y mermelada de tocineta ahumada en reducción de ron y miel. Acompañada de una porción de papas fritas sin aceite.',
   30900, true),
  ('Pizza marinera', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, camarón, pulpo, palmito y salsa especial. Acompañada de una porción de papas fritas sin aceite.',
   32900, true),
  ('Pizza mar y tierra', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, camarón, pollo, pimentón y maíz. Acompañada de una porción de papas fritas sin aceite.',
   31900, true),
  ('Pizza hawaiana', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, tocineta, jamón ahumado y piña. Acompañada de una porción de papas fritas sin aceite.',
   28900, true),
  ('Pizza mexicana', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, carne molida, maíz, pimentón, cebolla y picante. Acompañada de una porción de papas fritas sin aceite.',
   28900, true),
  ('Pizza especial', 'pizzas',
   'Pizza en cono de 18 cm de alto y 300 g, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, pollo, tocineta, jamón y champiñón. Acompañada de una porción de papas fritas sin aceite.',
   30900, true),
  ('Pizza chicken', 'pizzas',
   'Pizza en cono de 18 cm de alto y 300 g de relleno, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, pollo en cuadros y maíz. Acompañada de una porción de papas fritas sin aceite.',
   29900, true),
  ('Pizza BBQ', 'pizzas',
   'Pizza en cono de 18 cm de alto y 300 g de relleno, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, pollo en salsa BBQ y cebolla caramelizada. Acompañada de una porción de papas fritas sin aceite.',
   29900, true),
  ('Pizza vegetariana', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, en masa de finas hierbas, salsa napolitana, queso mozzarella, champiñón, tomate, maíz, cebolla caramelizada y parmesano. Acompañada de una porción de papas fritas sin aceite.',
   28900, true),
  ('Pizza teriyork', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, en masa de finas hierbas, salsa napolitana, queso mozzarella, pollo, carne molida, cebolla caramelizada y pimentón. Acompañada de una porción de papas fritas sin aceite.',
   29900, true),
  ('Pizza carnes', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, pepperoni, jamón ahumado y cábano. Acompañada de una porción de papas fritas sin aceite.',
   30900, true),
  ('Pizza carbonara', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, tocineta, jamón ahumado, maíz y parmesano. Acompañada de una porción de papas fritas sin aceite.',
   29900, true),
  ('Pizza ikónica', 'pizzas',
   'Pizza en cono de 18 cm de alto y 300 g de relleno, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, cuadritos de nuggets de pollo apanado, jamón ahumado y queso cheddar. Acompañada de una porción de papas fritas sin aceite.',
   30900, true),
  ('Pizza colombianita', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, elaborada en masa de finas hierbas, salsa napolitana, queso, carne desmechada, maduritos fritos, maíz y nachos de maíz. Acompañada de una porción de papas fritas sin aceite.',
   30900, true),
  ('Konys bondiola', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, elaborada en masa de finas hierbas, salsa napolitana, queso mozzarella, corte de bondiola de cerdo ahumada, champiñones frescos y queso parmesano. Acompañada de una porción de papas fritas sin aceite.',
   31900, true),
  ('Pizza lasagna', 'pizzas',
   'Pizza en cono de 18 cm y 300 g, elaborada en masa de finas hierbas, salsa napolitana, salsa blanca, queso mozzarella, carne molida, tocineta, maíz y queso parmesano. Acompañada de una porción de papas fritas sin aceite.',
   29900, true),
  ('Pizza italianísima', 'pizzas',
   'Pizza en cono con masa de finas hierbas, jamón serrano, tomates asados, bañada en salsa pesto y napolitana, queso mozzarella y galleta de parmesano. Acompañada de una porción de papas fritas sin aceite.',
   31900, true),

  ('Fries ikónicas (porción personal)', 'entradas',
   'Papas locas al estilo Konys: nuestras exclusivas papas a la francesa al horno con un mix de ingredientes Konys: chorizo santarrosano, salchicha llanera, carne de hamburguesa en trozos, lechuga fresca, maicitos, tártara, salsa de piña y queso costeño.',
   38000, true),

  ('Granizada de limón', 'bebidas', 'Limón y azúcar.', 9900, true),
  ('Granizada de yerbabuena', 'bebidas', 'Granizada de azúcar, yerbabuena y limón.', 9900, true),
  ('Granizada de mandarina', 'bebidas', 'Pulpa de mandarina y azúcar.', 9900, true),
  ('Granizada de maracumango', 'bebidas', 'Azúcar y maracumango.', 10900, true),
  ('Granizada de naranja', 'bebidas', 'Granizada de naranja y azúcar.', 9900, true),
  ('Granizada limonada de coco', 'bebidas', 'Azúcar, coco y limón.', 11000, true),
  ('Granizada cerezada', 'bebidas', 'Cerezas, azúcar, agua y limón.', 11000, true),
  ('Granizada piña colada', 'bebidas', 'Piña, coco, lechera y azúcar.', 11000, true),
  ('Cristal con gas 600 ml', 'bebidas', 'Agua.', 6000, true),
  ('Cristal sin gas 600 ml', 'bebidas', 'Agua.', 6000, true),
  ('Coca-Cola Original 400 ml', 'bebidas', 'Gaseosa.', 6000, true)
) as v(nombre, categoria, descripcion, precio, disponible)
where not exists (
  select 1 from public.platos p
  where p.nombre = v.nombre and p.categoria = v.categoria
);

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
