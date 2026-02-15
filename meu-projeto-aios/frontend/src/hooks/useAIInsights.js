import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../config/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useAIInsights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Buscar insights iniciais
  useEffect(() => {
    fetchInsights();

    // Subscribe a atualizações realtime
    const channel = supabase
      .channel('ai_insights_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          table: 'ai_insights',
        },
        (payload) => {
          console.log('[useAIInsights] Mudança detectada:', payload);
          // Buscar insights novamente quando há mudanças
          fetchInsights();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Buscar insights do API
  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/insights`);
      setInsights(response.data || []);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erro ao buscar insights';
      setError(errorMessage);
      console.error('Erro ao buscar insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Descartar insight
  const dismissInsight = useCallback(async (insightId) => {
    try {
      await axios.post(`${API_URL}/api/insights/${insightId}/dismiss`);

      // Atualizar estado local
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
    } catch (err) {
      console.error('Erro ao descartar insight:', err);
      setError('Erro ao descartar insight');
    }
  }, []);

  // Gerar insights sob demanda
  const generateInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await axios.post(`${API_URL}/api/insights/generate`);

      // Aguardar um pouco e buscar novamente
      setTimeout(() => {
        fetchInsights();
      }, 2000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erro ao gerar insights';
      setError(errorMessage);
      console.error('Erro ao gerar insights:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchInsights]);

  // Obter insights por severidade
  const getInsightsBySeverity = useCallback((severity) => {
    return insights.filter((i) => i.severity === severity);
  }, [insights]);

  // Contar insights por tipo
  const getInsightCount = useCallback(
    (type) => {
      return insights.filter((i) => i.type === type).length;
    },
    [insights]
  );

  return {
    insights,
    loading,
    error,
    fetchInsights,
    dismissInsight,
    generateInsights,
    getInsightsBySeverity,
    getInsightCount,
  };
}

export default useAIInsights;
