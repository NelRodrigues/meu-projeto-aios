import { useMemo } from 'react';

/**
 * Hook para formatar dados de métricas para Recharts
 */
export function useChartData(metrics = []) {
  // LineChart: Receita ao longo do tempo
  const revenueChartData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];

    return metrics.map((m) => ({
      date: new Date(m.snapshot_date).toLocaleDateString('pt-AO', {
        month: 'short',
        day: 'numeric',
      }),
      monthly: m.monthly_revenue,
      annual: m.annual_revenue / 12, // Mostrar média mensal do anual
      timestamp: m.snapshot_date,
    }));
  }, [metrics]);

  // PieChart: Projetos por status (última snapshot)
  const projectsChartData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];

    const lastMetric = metrics[metrics.length - 1];

    // Assumir que "in_progress" é uma parte do total
    const inProgress = lastMetric.projects_in_progress || 0;
    const completed = Math.max(0, inProgress * 0.5); // Estimativa
    const blocked = Math.max(0, inProgress * 0.2); // Estimativa

    return [
      { name: 'Em Andamento', value: inProgress, fill: '#3b82f6' },
      { name: 'Concluído', value: completed, fill: '#10b981' },
      { name: 'Bloqueado', value: blocked, fill: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  // BarChart: Satisfação por período
  const satisfactionChartData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];

    // Agrupar por semana e calcular média
    const weeklyData = [];
    let weekMetrics = [];
    let currentWeek = null;

    metrics.forEach((m) => {
      const date = new Date(m.snapshot_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (currentWeek !== weekKey && weekMetrics.length > 0) {
        const avgScore = (
          weekMetrics.reduce((sum, wm) => sum + (wm.avg_satisfaction_score || 0), 0) /
          weekMetrics.length
        ).toFixed(2);

        weeklyData.push({
          week: currentWeek,
          score: parseFloat(avgScore),
          count: weekMetrics.length,
        });

        weekMetrics = [];
      }

      currentWeek = weekKey;
      weekMetrics.push(m);
    });

    // Última semana
    if (weekMetrics.length > 0) {
      const avgScore = (
        weekMetrics.reduce((sum, wm) => sum + (wm.avg_satisfaction_score || 0), 0) /
        weekMetrics.length
      ).toFixed(2);

      weeklyData.push({
        week: currentWeek,
        score: parseFloat(avgScore),
        count: weekMetrics.length,
      });
    }

    return weeklyData.map((w) => ({
      week: new Date(w.week).toLocaleDateString('pt-AO', {
        month: 'short',
        day: 'numeric',
      }),
      satisfação: w.score,
      entries: w.count,
    }));
  }, [metrics]);

  // AreaChart: Clientes ao longo do tempo
  const clientsChartData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];

    return metrics.map((m) => ({
      date: new Date(m.snapshot_date).toLocaleDateString('pt-AO', {
        month: 'short',
        day: 'numeric',
      }),
      active: m.active_clients,
      timestamp: m.snapshot_date,
    }));
  }, [metrics]);

  // Estatísticas resumidas
  const stats = useMemo(() => {
    if (!metrics || metrics.length === 0) {
      return {
        currentClients: 0,
        monthlyRevenue: 0,
        avgSatisfaction: 0,
        projectsInProgress: 0,
        clientsChange: 0,
        revenueChange: 0,
        satisfactionChange: 0,
      };
    }

    const current = metrics[metrics.length - 1];
    const previous = metrics.length > 1 ? metrics[metrics.length - 2] : current;

    const clientsChange =
      current.active_clients && previous.active_clients
        ? ((current.active_clients - previous.active_clients) /
          previous.active_clients) *
          100
        : 0;

    const revenueChange =
      current.monthly_revenue && previous.monthly_revenue
        ? ((current.monthly_revenue - previous.monthly_revenue) /
          previous.monthly_revenue) *
          100
        : 0;

    const satisfactionChange =
      current.avg_satisfaction_score && previous.avg_satisfaction_score
        ? ((current.avg_satisfaction_score - previous.avg_satisfaction_score) /
          previous.avg_satisfaction_score) *
          100
        : 0;

    return {
      currentClients: current.active_clients,
      monthlyRevenue: current.monthly_revenue,
      avgSatisfaction: current.avg_satisfaction_score,
      projectsInProgress: current.projects_in_progress,
      clientsChange: parseFloat(clientsChange.toFixed(2)),
      revenueChange: parseFloat(revenueChange.toFixed(2)),
      satisfactionChange: parseFloat(satisfactionChange.toFixed(2)),
    };
  }, [metrics]);

  return {
    revenueChartData,
    projectsChartData,
    satisfactionChartData,
    clientsChartData,
    stats,
  };
}

export default useChartData;
