jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('servicio de Supabase', () => {
  it('crea el cliente con las variables de entorno', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://konys-test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-de-prueba';
    jest.resetModules();
    const { supabase } = require('../supabase');
    expect(supabase).toBeDefined();
  });
});
