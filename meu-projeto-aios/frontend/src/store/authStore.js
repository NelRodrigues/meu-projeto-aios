import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sua-chave-anon';

const supabase = createClient(supabaseUrl, supabaseKey);

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  // Inicializar autenticação
  initAuth: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        set({
          user: data.session.user,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Erro ao inicializar autenticação:', error);
    } finally {
      set({ loading: false });
    }
  },

  // Login
  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({
        user: data.user,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Logout
  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({
        user: null,
        isAuthenticated: false,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Registar
  signup: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));
