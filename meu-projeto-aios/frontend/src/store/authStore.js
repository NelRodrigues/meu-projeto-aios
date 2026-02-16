import { create } from 'zustand';

// Modo offline - sem Supabase
export const useAuthStore = create((set) => ({
  user: { id: 'demo', email: 'ceo@marcadigital.ao' },
  isAuthenticated: true,
  loading: false,

  // Inicializar autenticação
  initAuth: async () => {
    // Modo offline - sem autenticação
    set({ loading: false });
  },

  // Login
  login: async (email, password) => {
    set({
      user: { id: 'demo', email },
      isAuthenticated: true,
    });
    return { success: true };
  },

  // Logout
  logout: async () => {
    set({
      user: null,
      isAuthenticated: false,
    });
    return { success: true };
  },

  // Registar
  signup: async (email, password) => {
    return { success: true, data: { user: { email } } };
  },
}));
