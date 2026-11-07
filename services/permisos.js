// F3 (I-02, D-05, D-07): reglas puras de acceso del personal (mockups 05a a 05e).
// Solo deciden qué mostrar y a dónde ir. La seguridad real está en la base: RLS de
// 002_roles con puede(privilegio, sede); si la app se equivoca, la base rechaza.

// ¿El perfil tiene al menos uno de los privilegios?
export function puede(perfil, ...claves) {
  const propios = perfil?.privilegios ?? [];
  return claves.some((clave) => propios.includes(clave));
}

// Tarjetas del panel de la sede (05c/05d), en el orden del mockup. Solo las secciones que ya
// tienen pantalla: Personal (3C), Métodos de pago (F4) y Calificaciones (F5) se agregan después.
const TARJETAS = [
  {
    clave: 'reservas', titulo: 'Reservas', icono: 'calendar-outline', ruta: '/gestion/reservas',
    ver: ['reservas.ver', 'reservas.gestionar'],
    detalle: (p) => (puede(p, 'reservas.gestionar') ? 'Consultar, cancelar y completar'
      : puede(p, 'reservas.completar') ? 'Consultar y completar' : 'Solo consulta'),
  },
  {
    clave: 'mesas', titulo: 'Mesas', icono: 'grid-outline', ruta: '/gestion/mesas',
    ver: ['mesas.ver', 'mesas.gestionar'],
    detalle: (p) => (puede(p, 'mesas.gestionar') ? 'Crear, editar y activar mesas' : 'Solo consulta'),
  },
  {
    clave: 'horarios', titulo: 'Horarios', icono: 'time-outline', ruta: '/gestion/horarios',
    ver: ['horarios.gestionar'],
    detalle: () => '7 días · almuerzo y noche',
  },
  {
    clave: 'carta', titulo: 'Carta', icono: 'book-outline', ruta: '/gestion/carta',
    ver: ['carta.gestionar', 'carta.disponibilidad'],
    detalle: (p) => (puede(p, 'carta.gestionar') ? 'Platos, precios y disponibilidad' : 'Solo disponibilidad'),
  },
  {
    clave: 'personal', titulo: 'Personal', icono: 'people-outline', ruta: '/gestion/personal',
    ver: ['usuarios.gestionar'],
    detalle: () => 'Cuentas, roles y acceso',
  },
];

export function tarjetasPanel(perfil) {
  return TARJETAS.filter((t) => puede(perfil, ...t.ver))
    .map(({ clave, titulo, icono, ruta, detalle }) => ({ clave, titulo, icono, ruta, detalle: detalle(perfil) }));
}

// A dónde va el usuario después de ingresar o al reabrir la app (05a → 05e/05b/05c), o por qué
// no puede entrar. El orden importa: primero lo que bloquea, después la clave temporal (D-07).
export function evaluarIngreso(perfil) {
  if (!perfil) return { error: 'Tu cuenta no tiene acceso de personal. Pide al administrador que te registre.' };
  if (!perfil.activo) return { error: 'Tu cuenta está suspendida. Habla con el administrador de tu sede.' };
  if (!perfil.rol?.activo) return { error: 'Tu rol está deshabilitado por ahora. Habla con el administrador.' };
  if (perfil.debe_cambiar_clave) return { destino: '/cambiar-clave' };
  if (perfil.rol.codigo === 'admin_general') return { destino: '/panel' };
  if (!perfil.sede) return { error: 'Tu cuenta no tiene una sede asignada. Habla con el administrador.' };
  // El rol puede tener permisos de secciones que aún no existen (pagos F4, calificaciones F5).
  // En ese caso entra al panel, que explica que todavía no hay tarjetas disponibles.
  if (!(perfil.privilegios ?? []).length) {
    return { error: 'Tu rol no tiene permisos asignados. Habla con el administrador.' };
  }
  return { destino: '/panel/sede' };
}

export function esAdminGeneral(perfil) {
  return perfil?.rol?.codigo === 'admin_general';
}

// F3C (D-04): el admin de sede y los roles globales solo los toca el admin general; nadie se
// gestiona a sí mismo. La base y las Edge Functions aplican la misma regla.
export function puedeGestionarPerfil(perfil, objetivo) {
  if (!perfil || !objetivo || perfil.id === objetivo.id) return false;
  const reservado = objetivo.rol?.alcance === 'global' || objetivo.rol?.codigo === 'admin_sede';
  return reservado ? esAdminGeneral(perfil) : puede(perfil, 'usuarios.gestionar');
}

// Roles que se ofrecen en 14b, con el motivo si no se pueden elegir. Solo roles de sede activos.
// - personalSede: perfiles de la sede, para saber si ya tiene admin (un solo admin por sede).
// - editandoId: el perfil en edición no cuenta como "ya asignado".
export function rolesAsignables(perfil, roles, personalSede = [], editandoId = null) {
  const adminOcupado = personalSede.some((p) => p.rol?.codigo === 'admin_sede' && p.id !== editandoId);
  return (roles ?? []).filter((r) => r.alcance === 'sede' && r.activo).map((r) => {
    let motivo = null;
    if (r.codigo === 'admin_sede') {
      if (!esAdminGeneral(perfil)) motivo = 'solo el admin general';
      else if (adminOcupado) motivo = 'ya asignado';
    }
    return { ...r, motivo };
  });
}

// "Mesero puede: Ver mesas · Ver reservas · …" (14b).
export function resumenPrivilegios(rol) {
  return (rol?.privilegios ?? []).map((p) => p.descripcion).join(' · ');
}

// F3 (15): orden del mockup: los 6 roles del sistema en su orden de semilla y después los
// personalizados por nombre.
const ORDEN_SISTEMA = ['admin_general', 'admin_sede', 'recepcion', 'mesero', 'jefe_cocina', 'cocina'];

export function ordenarRoles(roles = []) {
  const posicion = (rol) => {
    const indice = ORDEN_SISTEMA.indexOf(rol.codigo);
    return indice === -1 ? ORDEN_SISTEMA.length : indice;
  };
  return [...roles].sort((a, b) => {
    if (a.es_sistema !== b.es_sistema) return a.es_sistema ? -1 : 1;
    return posicion(a) - posicion(b) || String(a.nombre).localeCompare(String(b.nombre), 'es');
  });
}

// Línea de la tarjeta de 15: "Su sede · 13 permisos · del sistema" o
// "Personalizado · 2 permisos · oculto".
export function resumenRol(rol) {
  const total = rol?.privilegios?.length ?? 0;
  const permisos = `${total} permiso${total === 1 ? '' : 's'}`;
  const tipo = rol?.es_sistema
    ? (rol.alcance === 'global' ? 'Todas las sedes' : 'Su sede')
    : 'Personalizado';
  return [tipo, permisos, rol?.es_sistema && 'del sistema', !rol?.activo && 'oculto']
    .filter(Boolean).join(' · ');
}

// F3 (15b/15c): agrupa el catálogo con los títulos del mockup, en su orden. No filtra por
// alcance: la pantalla muestra los globales deshabilitados cuando el rol es de sede.
const GRUPOS_PRIVILEGIOS = [
  { titulo: 'Mesas', claves: ['mesas.ver', 'mesas.gestionar'] },
  { titulo: 'Horarios', claves: ['horarios.gestionar'] },
  { titulo: 'Reservas', claves: ['reservas.ver', 'reservas.gestionar', 'reservas.completar', 'reservas.liberar'] },
  { titulo: 'Carta', claves: ['carta.gestionar', 'carta.disponibilidad'] },
  { titulo: 'Pagos', claves: ['pagos.ver', 'pagos.gestionar'] },
  { titulo: 'Calificaciones', claves: ['calificaciones.ver'] },
  { titulo: 'Personal', claves: ['usuarios.gestionar'] },
  { titulo: 'Administración general', claves: ['sedes.gestionar', 'roles.gestionar'], soloGlobal: true },
];

// F3 (15b/15c): dependencias de lectura. Completar o liberar una reserva exige poder verla;
// los permisos de pago se muestran en la tarjeta de Reservas. Así el rol nunca queda con
// privilegios que la app no puede usar (por ejemplo, solo `reservas.completar`).
const DEPENDENCIAS = {
  'reservas.completar': ['reservas.ver'],
  'reservas.liberar': ['reservas.ver'],
  'pagos.ver': ['reservas.ver'],
  'pagos.gestionar': ['pagos.ver', 'reservas.ver'],
};
const DEPENDIENTES = {
  'reservas.ver': ['reservas.completar', 'reservas.liberar', 'pagos.ver', 'pagos.gestionar'],
  'pagos.ver': ['pagos.gestionar'],
};

export function alternarPrivilegio(seleccion = [], clave) {
  if (seleccion.includes(clave)) {
    const dependientes = DEPENDIENTES[clave] ?? [];
    return seleccion.filter((c) => c !== clave && !dependientes.includes(c));
  }
  return [...new Set([...seleccion, clave, ...(DEPENDENCIAS[clave] ?? [])])];
}

export function agruparPrivilegios(privilegios = []) {
  const usadas = new Set();
  const grupos = GRUPOS_PRIVILEGIOS.map((grupo) => {
    // Respeta el orden del mockup, no el alfabético del catálogo.
    const items = grupo.claves
      .map((clave) => privilegios.find((p) => p.clave === clave))
      .filter(Boolean);
    items.forEach((p) => usadas.add(p.clave));
    return { titulo: grupo.titulo, soloGlobal: Boolean(grupo.soloGlobal), items };
  }).filter((grupo) => grupo.items.length);
  const otros = privilegios.filter((p) => !usadas.has(p.clave));
  if (otros.length) grupos.push({ titulo: 'Otros', soloGlobal: false, items: otros });
  return grupos;
}

// "Hola, Jorge": solo el primer nombre.
export function primerNombre(perfil) {
  return String(perfil?.nombre ?? '').trim().split(/\s+/)[0] || 'equipo';
}
