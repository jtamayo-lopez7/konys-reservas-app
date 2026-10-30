-- =====================================================================
-- Konys Pizza: carga de la carta real en public.platos
-- Fuente: carta-konys.md (30 platos), 2026-10-29.
-- Ejecutar completo en Supabase > SQL Editor (corre como postgres, no le
-- aplica RLS). Es idempotente: una segunda ejecución no duplica platos.
--
-- Ajustes para bases existentes:
--   * Se agregan 'combos' y 'otros' al CHECK de categoria (la carta trae
--     "Combo lasaña personal"). Debe reflejarse también en
--     constants/dominio.js (RNF-08: CHECK y constantes van juntos).
--   * Se borran los 4 platos de prueba con precio 0.
-- Ortografía: solo tildes, unidades (18 cm, 300 g), "mozzarella",
-- "cheddar" y puntuación; no se cambió ningún ingrediente ni precio.
-- =====================================================================

begin;

-- 1. CHECK de categoria con 'combos' y 'otros'. Se busca por definición porque el
--    nombre del CHECK lo generó Postgres al crear la tabla.
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.platos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%categoria%'
  loop
    execute format('alter table public.platos drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.platos
  add constraint platos_categoria_check
  check (categoria in ('combos', 'pizzas', 'entradas', 'postres', 'bebidas', 'otros'));

-- 2. Platos de prueba del schema.sql (precio 0, descripción pendiente).
delete from public.platos
where precio = 0
  and descripcion = 'Descripción pendiente'
  and nombre in ('Margarita', 'Hawaiana', 'Pepperoni', 'Cuatro quesos');

-- 3. Carta real.
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

commit;

-- 4. Verificación (debe dar bebidas 11, combos 1, entradas 1, pizzas 17).
select categoria, count(*) as platos, min(precio), max(precio)
from public.platos
where disponible
group by categoria
order by categoria;
