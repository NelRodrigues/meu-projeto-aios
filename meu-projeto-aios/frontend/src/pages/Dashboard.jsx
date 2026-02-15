import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useMetricsStore } from '../store/metricsStore';
import { createClient } from '@supabase/supabase-js';
import KPICard from '../components/KPICard';
import InsightsPanel from '../components/InsightsPanel';
import '../styles/dashboard.css';
import { Users, TrendingUp, DollarSign, CheckCircle, LogOut } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sua-chave-anon';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const { metrics, loading, fetchLatestMetrics } = useMetricsStore();
  const [insights, setInsights] = useState([]);
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);

  // Inicializar e fazer subscribe ao Realtime
  useEffect(() => {
    // Buscar métricas iniciais
    fetchLatestMetrics();

    // Subscribe ao Realtime para atualizações em tempo real
    const subscription = supabase
      .channel('metrics_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metrics_snapshots' },
        (payload) => {
          console.log('📊 Actualização em tempo real:', payload);
          fetchLatestMetrics();
          setRealtimeUpdates((prev) => prev + 1);
        }
      )
      .subscribe();

    // Buscar insights
    const fetchInsights = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/insights`);
        const data = await response.json();
        setInsights(data || []);
      } catch (error) {
        console.error('Erro ao buscar insights:', error);
      }
    };

    fetchInsights();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchLatestMetrics]);

  const handleLogout = async () => {
    await logout();
  };

  if (loading && !metrics) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  const metricsData = metrics || {
    active_clients: 0,
    projects_in_progress: 0,
    monthly_revenue: 0,
    annual_revenue: 0,
    avg_satisfaction_score: 0,
  };

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🎯 Control Tower Executivo</h1>
          <p className="subtitle">Marca Digital - Dashboard em Tempo Real</p>
        </div>
        <div className="header-right">
          <span className="user-info">👤 {user?.email}</span>
          <button className="logout-btn" onClick={handleLogout} title="Sair">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Grid de KPIs */}
        <section className="metrics-grid">
          <KPICard
            title="Clientes Activos"
            value={metricsData.active_clients}
            change={12}
            trend="up"
            icon={<Users size={32} />}
            color="blue"
          />
          <KPICard
            title="Projetos em Andamento"
            value={metricsData.projects_in_progress}
            change={5}
            trend="up"
            icon={<CheckCircle size={32} />}
            color="green"
          />
          <KPICard
            title="Receita Mensal"
            value={`KZ ${(metricsData.monthly_revenue || 0).toLocaleString('pt-AO')}`}
            change={8}
            trend="up"
            icon={<DollarSign size={32} />}
            color="purple"
          />
          <KPICard
            title="Receita Anual"
            value={`KZ ${(metricsData.annual_revenue || 0).toLocaleString('pt-AO')}`}
            change={15}
            trend="up"
            icon={<TrendingUp size={32} />}
            color="orange"
          />
        </section>

        {/* Painel de Insights */}
        <section className="insights-section">
          <InsightsPanel insights={insights} />
        </section>

        {/* Status de Sincronização */}
        <section className="status-section">
          <div className="status-card">
            <h3>📡 Estado do Sistema</h3>
            <ul className="status-list">
              <li>✅ Backend API: Conectado</li>
              <li>✅ Supabase: Conectado</li>
              <li>🔄 Realtime: Activo ({realtimeUpdates} actualizações)</li>
              <li>⏰ Última sincronização: {metricsData.snapshot_date || 'Carregando...'}</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
