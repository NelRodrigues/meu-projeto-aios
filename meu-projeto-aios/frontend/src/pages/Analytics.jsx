import { useState } from 'react';
import DateRangePicker from '../components/DateRangePicker';
import RevenueChart from '../components/RevenueChart';
import ProjectsChart from '../components/ProjectsChart';
import SatisfactionChart from '../components/SatisfactionChart';
import { SkeletonChart, SkeletonGrid } from '../components/LoadingSkeleton';
import { useRealtimeMetrics } from '../hooks/useRealtimeMetrics';
import { useChartData } from '../hooks/useChartData';
import '../styles/analytics.css';
import { Download, Share2, RefreshCw } from 'lucide-react';

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { metrics, loading, error } = useRealtimeMetrics(days);
  const {
    revenueChartData,
    projectsChartData,
    satisfactionChartData,
    stats
  } = useChartData(metrics);

  const handleDateRangeChange = (newDays) => {
    setDays(newDays);
  };

  const handleExportCSV = () => {
    if (!metrics || metrics.length === 0) {
      alert('Sem dados para exportar');
      return;
    }

    // Criar CSV
    const headers = ['Data', 'Clientes', 'Projetos', 'Receita Mensal', 'Receita Anual', 'Satisfação'];
    const rows = metrics.map((m) => [
      m.snapshot_date,
      m.active_clients,
      m.projects_in_progress,
      m.monthly_revenue.toFixed(2),
      m.annual_revenue.toFixed(2),
      m.avg_satisfaction_score.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    const text = `📊 Analytics - ${days} dias\nClientes: ${stats.currentClients}\nReceita: KZ ${stats.monthlyRevenue.toLocaleString('pt-AO')}\nSatisfação: ⭐ ${stats.avgSatisfaction.toFixed(2)}/10`;

    if (navigator.share) {
      navigator.share({
        title: 'Control Tower Analytics',
        text: text,
      });
    } else {
      // Fallback: copiar para clipboard
      navigator.clipboard.writeText(text);
      alert('Texto copiado para clipboard');
    }
  };

  if (error) {
    return (
      <div className="analytics-error">
        <h2>❌ Erro ao carregar análises</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <header className="analytics-header">
        <h1>📊 Análises Detalhadas</h1>
        <div className="header-actions">
          <button className="action-btn" onClick={() => window.location.reload()}>
            <RefreshCw size={18} />
            Actualizar
          </button>
          <button className="action-btn" onClick={handleShare}>
            <Share2 size={18} />
            Partilhar
          </button>
          <button className="action-btn primary" onClick={handleExportCSV}>
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </header>

      {/* Date Range Picker */}
      <DateRangePicker onDateRangeChange={handleDateRangeChange} defaultDays={30} />

      {/* Stats Overview */}
      {!loading && (
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <p className="stat-label">Clientes Activos</p>
              <p className="stat-main">{stats.currentClients}</p>
              <p className={`stat-change ${stats.clientsChange >= 0 ? 'positive' : 'negative'}`}>
                {stats.clientsChange >= 0 ? '+' : ''}{stats.clientsChange}%
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <p className="stat-label">Receita Mensal</p>
              <p className="stat-main">
                KZ {stats.monthlyRevenue.toLocaleString('pt-AO', {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className={`stat-change ${stats.revenueChange >= 0 ? 'positive' : 'negative'}`}>
                {stats.revenueChange >= 0 ? '+' : ''}{stats.revenueChange}%
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <p className="stat-label">Satisfação Média</p>
              <p className="stat-main">{stats.avgSatisfaction.toFixed(2)}/10</p>
              <p className={`stat-change ${stats.satisfactionChange >= 0 ? 'positive' : 'negative'}`}>
                {stats.satisfactionChange >= 0 ? '+' : ''}{stats.satisfactionChange}%
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <p className="stat-label">Projetos em Andamento</p>
              <p className="stat-main">{stats.projectsInProgress}</p>
              <p className="stat-change">Total activos</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="charts-section">
        {loading ? (
          <div className="skeleton-chart-grid">
            <SkeletonChart />
            <SkeletonChart />
            <SkeletonChart />
          </div>
        ) : (
          <div className="charts-grid">
            <RevenueChart data={revenueChartData} />
            <ProjectsChart data={projectsChartData} />
            <SatisfactionChart data={satisfactionChartData} />
          </div>
        )}
      </div>

      {/* Data Table */}
      {!loading && metrics.length > 0 && (
        <div className="metrics-table-wrapper">
          <h3>📋 Dados Detalhados</h3>
          <div className="metrics-table-scroll">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Clientes</th>
                  <th>Projetos</th>
                  <th>Receita Mensal</th>
                  <th>Receita Anual</th>
                  <th>Satisfação</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.snapshot_date}>
                    <td>{new Date(m.snapshot_date).toLocaleDateString('pt-AO')}</td>
                    <td className="number">{m.active_clients}</td>
                    <td className="number">{m.projects_in_progress}</td>
                    <td className="number">
                      KZ {m.monthly_revenue.toLocaleString('pt-AO', {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="number">
                      KZ {m.annual_revenue.toLocaleString('pt-AO', {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="number">
                      ⭐ {m.avg_satisfaction_score?.toFixed(2) || '-'}/10
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
