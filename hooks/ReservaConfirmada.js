import { createContext, useContext, useState } from 'react';

const ReservaContext = createContext(null);

export function ReservaProvider({ children }) {
  // Solo en memoria: el nombre y teléfono no se guardan en URLs ni almacenamiento.
  const [reserva, setReserva] = useState(null);
  return <ReservaContext.Provider value={{ reserva, setReserva }}>{children}</ReservaContext.Provider>;
}

export function useReservaConfirmada() {
  return useContext(ReservaContext);
}
