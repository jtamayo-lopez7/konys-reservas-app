import { esAdminGeneral, evaluarIngreso, primerNombre, puede, puedeGestionarPerfil, resumenPrivilegios, rolesAsignables, tarjetasPanel } from '../permisos';

// Matriz de 002_roles (D-05): 15 / 13 / 7 / 5 / 2 / 1.
const TODOS = ['sedes.gestionar', 'roles.gestionar', 'usuarios.gestionar', 'mesas.ver', 'mesas.gestionar',
  'horarios.gestionar', 'reservas.ver', 'reservas.gestionar', 'reservas.completar', 'reservas.liberar',
  'carta.gestionar', 'carta.disponibilidad', 'pagos.ver', 'pagos.gestionar', 'calificaciones.ver'];
const MATRIZ = {
  admin_general: TODOS,
  admin_sede: TODOS.filter((p) => !['sedes.gestionar', 'roles.gestionar'].includes(p)),
  recepcion: ['mesas.ver', 'reservas.ver', 'reservas.gestionar', 'reservas.completar', 'reservas.liberar', 'pagos.ver', 'calificaciones.ver'],
  mesero: ['mesas.ver', 'reservas.ver', 'reservas.completar', 'reservas.liberar', 'pagos.ver'],
  jefe_cocina: ['carta.gestionar', 'carta.disponibilidad'],
  cocina: ['carta.disponibilidad'],
};
const sede = { id: 's1', nombre: 'Sede Cabecera', activa: true };
const perfil = (codigo, cambios = {}) => ({
  nombre: 'Laura Gómez', activo: true, debe_cambiar_clave: false,
  rol: { codigo, nombre: codigo, activo: true }, sede: codigo === 'admin_general' ? null : sede,
  privilegios: MATRIZ[codigo] ?? [], ...cambios,
});
const claves = (p) => tarjetasPanel(p).map((t) => t.clave);

describe('U-06: acceso de personal', () => {
  it('la matriz tiene los totales del mockup 15', () => {
    expect(Object.values(MATRIZ).map((m) => m.length)).toEqual([15, 13, 7, 5, 2, 1]);
  });

  it.each([
    ['admin_general', '/panel'],
    ['admin_sede', '/panel/sede'],
    ['recepcion', '/panel/sede'],
    ['mesero', '/panel/sede'],
    ['jefe_cocina', '/panel/sede'],
    ['cocina', '/panel/sede'],
  ])('%s entra a %s', (codigo, destino) => {
    expect(evaluarIngreso(perfil(codigo))).toEqual({ destino });
  });

  it('la clave temporal manda a cambiarla antes del panel (D-07)', () => {
    expect(evaluarIngreso(perfil('mesero', { debe_cambiar_clave: true }))).toEqual({ destino: '/cambiar-clave' });
    expect(evaluarIngreso(perfil('admin_general', { debe_cambiar_clave: true }))).toEqual({ destino: '/cambiar-clave' });
  });

  it.each([
    ['sin perfil', null, 'no tiene acceso'],
    ['suspendido', perfil('mesero', { activo: false }), 'suspendida'],
    ['rol oculto', perfil('mesero', { rol: { codigo: 'mesero', activo: false } }), 'deshabilitado'],
    ['sin sede', perfil('mesero', { sede: null }), 'sede asignada'],
    ['sin privilegios', perfil('mesero', { privilegios: [] }), 'no tiene permisos'],
    ['solo privilegios sin pantalla', perfil('mesero', { privilegios: ['pagos.ver'] }), 'no tiene permisos'],
  ])('no deja entrar: %s', (_, p, texto) => {
    const r = evaluarIngreso(p);
    expect(r.destino).toBeUndefined();
    expect(r.error).toContain(texto);
  });

  it('suspensión pesa más que la clave temporal', () => {
    expect(evaluarIngreso(perfil('mesero', { activo: false, debe_cambiar_clave: true })).error).toContain('suspendida');
  });

  it.each([
    ['admin_sede', ['reservas', 'mesas', 'horarios', 'carta', 'personal']],
    ['recepcion', ['reservas', 'mesas']],
    ['mesero', ['reservas', 'mesas']],
    ['jefe_cocina', ['carta']],
    ['cocina', ['carta']],
  ])('tarjetas de %s (05c/05d)', (codigo, esperadas) => {
    expect(claves(perfil(codigo))).toEqual(esperadas);
  });

  it('el detalle refleja lo que el rol puede hacer', () => {
    const detalle = (codigo, clave) => tarjetasPanel(perfil(codigo)).find((t) => t.clave === clave).detalle;
    expect(detalle('mesero', 'mesas')).toBe('Solo consulta');
    expect(detalle('admin_sede', 'mesas')).toBe('Crear, editar y activar mesas');
    expect(detalle('mesero', 'reservas')).toBe('Consultar y completar');
    expect(detalle('recepcion', 'reservas')).toBe('Consultar, cancelar y completar');
    expect(detalle('cocina', 'carta')).toBe('Solo disponibilidad');
    expect(detalle('jefe_cocina', 'carta')).toBe('Platos, precios y disponibilidad');
  });

  it('puede, esAdminGeneral y primerNombre', () => {
    expect(puede(perfil('mesero'), 'reservas.gestionar')).toBe(false);
    expect(puede(perfil('mesero'), 'reservas.gestionar', 'reservas.completar')).toBe(true);
    expect(puede(null, 'mesas.ver')).toBe(false);
    expect(esAdminGeneral(perfil('admin_general'))).toBe(true);
    expect(esAdminGeneral(perfil('admin_sede'))).toBe(false);
    expect(primerNombre(perfil('mesero'))).toBe('Laura');
    expect(primerNombre({ nombre: '  ' })).toBe('equipo');
  });
});

describe('U-06: cuentas de personal (F3C)', () => {
  const general = { ...perfil('admin_general'), id: 'g' };
  const adminA = { ...perfil('admin_sede'), id: 'a' };
  const objetivo = (codigo, id = 'x') => ({ id, rol: { codigo, alcance: codigo === 'admin_general' ? 'global' : 'sede' } });

  it('admin de sede gestiona su personal, pero no al admin de sede ni a sí mismo', () => {
    expect(puedeGestionarPerfil(adminA, objetivo('mesero'))).toBe(true);
    expect(puedeGestionarPerfil(adminA, objetivo('admin_sede'))).toBe(false);
    expect(puedeGestionarPerfil(adminA, objetivo('admin_general'))).toBe(false);
    expect(puedeGestionarPerfil(adminA, { ...objetivo('admin_sede'), id: 'a' })).toBe(false);
  });
  it('admin general gestiona al admin de sede; un mesero no gestiona a nadie', () => {
    expect(puedeGestionarPerfil(general, objetivo('admin_sede'))).toBe(true);
    expect(puedeGestionarPerfil(general, { ...objetivo('admin_general'), id: 'g' })).toBe(false);
    expect(puedeGestionarPerfil({ ...perfil('mesero'), id: 'm' }, objetivo('cocina'))).toBe(false);
  });

  const roles = [
    { id: 'r0', codigo: 'admin_general', alcance: 'global', activo: true },
    { id: 'r1', codigo: 'admin_sede', alcance: 'sede', activo: true },
    { id: 'r2', codigo: 'mesero', alcance: 'sede', activo: true, privilegios: [{ descripcion: 'Ver mesas' }, { descripcion: 'Ver reservas' }] },
    { id: 'r3', codigo: 'oculto', alcance: 'sede', activo: false },
  ];
  const motivos = (p, personal, editando) => Object.fromEntries(rolesAsignables(p, roles, personal, editando).map((r) => [r.codigo, r.motivo]));

  it('solo roles de sede activos; admin de sede reservado al admin general y uno por sede (D-04)', () => {
    expect(motivos(general, [])).toEqual({ admin_sede: null, mesero: null });
    expect(motivos(adminA, [])).toEqual({ admin_sede: 'solo el admin general', mesero: null });
    const conAdmin = [{ id: 'a', rol: { codigo: 'admin_sede' } }];
    expect(motivos(general, conAdmin).admin_sede).toBe('ya asignado');
    expect(motivos(general, conAdmin, 'a').admin_sede).toBeNull();
  });
  it('resumen de privilegios para 14b', () => {
    expect(resumenPrivilegios(roles[2])).toBe('Ver mesas · Ver reservas');
    expect(resumenPrivilegios(null)).toBe('');
  });
});
