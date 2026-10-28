// RF-01, RF-04, RF-05, RF-07: manejo común de respuestas y fallos de red.
import { traducir } from './errores';

export async function consultar(operacion) {
  try {
    const { data, error } = await operacion();
    return error ? { data: null, error: traducir(error) } : { data, error: null };
  } catch (error) {
    return { data: null, error: traducir(error) };
  }
}
