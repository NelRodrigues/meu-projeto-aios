import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useMetricsStore } from '../store/metricsStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Hook para monitorar métricas em tempo real com Supabase Realtime
 */
export function useRealtimeMetrics(days = 30) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchMetricsHistory = useMetricsStore((state) => state.fetchMetricsHistory);

  useEffect(() => {
    // Buscar histórico inicial
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const data = await fetchMetricsHistory(days);
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();

    // Subscribe a atualizações em tempo real
    const channel = supabase
      .channel('metrics_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metrics_snapshots' },
        (payload) => {
          // Atualizar métricas quando houver mudança
          setMetrics((prevMetrics) => {
            const updated = prevMetrics.filter(
              (m) => m.snapshot_date !== payload.new.snapshot_date
            );
            return [...updated, payload.new].sort(
              (a, b) =>
                new Date(a.snapshot_date) - new Date(b.snapshot_date)
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [days, fetchMetricsHistory]);

  return { metrics, loading, error };
}

export default useRealtimeMetrics;
