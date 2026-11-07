// RF-16: sede elegida en la bienvenida (RN-10). Vive solo en memoria: se elige en cada arranque.
import { createContext, useContext, useMemo, useState } from 'react';

const SedeContext = createContext(null);

export function SedeProvider({ children }) {
  const [sede, setSede] = useState(null);
  const valor = useMemo(() => ({ sede, seleccionar: setSede }), [sede]);
  return <SedeContext.Provider value={valor}>{children}</SedeContext.Provider>;
}

export function useSede() {
  return useContext(SedeContext);
}
