export const ZONAS = { salon: 'Salón', terraza: 'Terraza' };
export const JORNADAS = { almuerzo: 'Almuerzo', noche: 'Noche' };
export const CATEGORIAS = {
  pizzas: 'Pizzas', entradas: 'Entradas', postres: 'Postres', bebidas: 'Bebidas', combos: 'Combos', otros: 'Otros',
};
export const ESTADOS = {
  confirmada: 'Confirmada', cancelada: 'Cancelada', completada: 'Completada',
};
// El índice coincide con Date.getDay(). Los valores coinciden con los CHECK de SQL.
export const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
// Los valores de SQL van sin tildes; la interfaz usa estas etiquetas.
export const DIAS_LARGO = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};
export const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
export const DIAS_RESERVA = 14;
