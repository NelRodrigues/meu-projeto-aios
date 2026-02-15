import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

export const useMetricsStore = create((set) => ({
  metrics: null,
  history: [],
  loading: false,
  error: null,

  // Obter últimas métricas
  fetchLatestMetrics: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/metrics/latest');
      set({ metrics: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Obter histórico de métricas
  fetchMetricsHistory: async (days = 30) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/metrics/history', {
        params: { days },
      });
      set({ history: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Actualizar métricas localmente
  setMetrics: (metrics) => set({ metrics }),
}));
