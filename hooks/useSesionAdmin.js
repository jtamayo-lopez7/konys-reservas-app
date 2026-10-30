// RF-08: sesión del administrador; la persistencia en disco la hace Supabase con AsyncStorage.
import { useCallback, useEffect, useState } from 'react';
import { cerrarSesion, ingresar, sesion } from '../services/auth';

export function useSesionAdmin() {
  const [estado, setEstado] = useState({ cargando: true, activa: false, error: null });

  useEffect(() => {
    let vigente = true;
    sesion().then((resultado) => {
      if (vigente) setEstado({ cargando: false, activa: !!resultado.data, error: resultado.error });
    });
    return () => { vigente = false; };
  }, []);

  const entrar = useCallback(async (clave) => {
    setEstado({ cargando: true, activa: false, error: null });
    const resultado = await ingresar(clave);
    setEstado({ cargando: false, activa: !resultado.error, error: resultado.error });
  }, []);

  const salir = useCallback(async () => {
    await cerrarSesion();
    setEstado({ cargando: false, activa: false, error: null });
  }, []);

  return { ...estado, entrar, salir };
}
