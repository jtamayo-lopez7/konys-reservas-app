// F3 (05a a 05e): sesión del personal y sede que se gestiona. Es independiente de la sede que
// elige el cliente en la bienvenida (hooks/SedeSeleccionada.js).
// - Un rol de sede gestiona siempre la sede de su perfil.
// - El admin general elige la sede en el panel (05b).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Redirect } from 'expo-router';
import { cambiarClave as cambiarClaveAuth, cargarSesion, cerrarSesion, ingresar as ingresarAuth } from '../services/auth';
import { esAdminGeneral, evaluarIngreso, puede as puedePerfil } from '../services/permisos';
import EstadoPantalla from '../components/EstadoPantalla';

const SesionContext = createContext(null);

export function SesionPersonalProvider({ children }) {
  const [estado, setEstado] = useState({ cargando: true, perfil: null, error: null });
  const [sedeElegida, setSedeElegida] = useState(null);

  const aplicar = useCallback((perfil, error = null) => {
    setEstado({ cargando: false, perfil, error });
    if (!perfil) setSedeElegida(null);
  }, []);

  const recargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    const resultado = await cargarSesion();
    aplicar(resultado.data ?? null, resultado.error);
    return resultado;
  }, [aplicar]);

  // Al abrir la app el estado ya empieza en "cargando": solo se aplica la respuesta.
  useEffect(() => {
    let vigente = true;
    cargarSesion().then((r) => { if (vigente) aplicar(r.data ?? null, r.error); });
    return () => { vigente = false; };
  }, [aplicar]);

  const ingresar = useCallback(async (correo, clave) => {
    const resultado = await ingresarAuth(correo, clave);
    if (!resultado.error) { setSedeElegida(null); aplicar(resultado.data); }
    return resultado;
  }, [aplicar]);

  const cambiarClave = useCallback(async (nueva) => {
    const resultado = await cambiarClaveAuth(nueva);
    if (!resultado.error) aplicar(resultado.data);
    return resultado;
  }, [aplicar]);

  const salir = useCallback(async () => {
    await cerrarSesion();
    aplicar(null);
  }, [aplicar]);

  const perfil = estado.perfil;
  // El rol de sede no elige: su sede es la del perfil (la RLS tampoco le deja ver otra).
  const sedeGestion = esAdminGeneral(perfil) ? sedeElegida : perfil?.sede ?? null;

  const valor = useMemo(() => ({
    ...estado,
    sedeGestion,
    elegirSede: setSedeElegida,
    puede: (...claves) => puedePerfil(perfil, ...claves),
    ingresar, cambiarClave, salir, recargar,
  }), [estado, sedeGestion, perfil, ingresar, cambiarClave, salir, recargar]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesionPersonal() {
  return useContext(SesionContext);
}

// Guardia de las pantallas del personal. Devuelve null si se puede mostrar la pantalla o el
// elemento que se debe mostrar en su lugar. Se llama después de los demás hooks de la pantalla.
// - privilegios: basta con uno; vacío = cualquier miembro del personal.
// - conSede: la pantalla trabaja sobre la sede gestionada (por defecto sí).
export function useGuardiaPersonal(privilegios = [], { conSede = true } = {}) {
  const { cargando, perfil, sedeGestion, error, recargar } = useSesionPersonal();
  if (cargando) return <EstadoPantalla cargando />;
  if (error && !perfil) return <EstadoPantalla mensaje={error} onReintentar={recargar} />;
  const evaluacion = evaluarIngreso(perfil);
  if (evaluacion.error) return <Redirect href="/acceso" />;
  if (evaluacion.destino === '/cambiar-clave') return <Redirect href="/cambiar-clave" />;
  if (conSede && !sedeGestion) return <Redirect href="/panel" />;
  if (privilegios.length && !puedePerfil(perfil, ...privilegios)) {
    return <EstadoPantalla mensaje="Tu rol no tiene acceso a esta sección." />;
  }
  return null;
}
