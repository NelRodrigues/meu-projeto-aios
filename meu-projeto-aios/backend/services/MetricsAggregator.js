/**
 * Metrics Aggregator
 * Agregação diária de métricas
 * Inspirado em: .aios-core/quality/metrics-collector.js
 */

export class MetricsAggregator {
  constructor(supabaseAdmin, logger = console) {
    this.supabaseAdmin = supabaseAdmin;
    this.logger = logger;
    this.retentionDays = 90; // Guardar 90 dias de histórico
  }

  /**
   * Agregar métricas para um dia específico
   */
  async aggregateDailyMetrics(date = null) {
    const snapshotDate = date
      ? date.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    this.logger.info(`📊 Agregando métricas para ${snapshotDate}...`);

    try {
      // 1. Contar clientes activos
      const { count: activeClients } = await this.supabaseAdmin
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      this.logger.debug(`  📈 Clientes activos: ${activeClients}`);

      // 2. Contar projetos em andamento
      const { count: projectsInProgress } = await this.supabaseAdmin
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      this.logger.debug(`  📈 Projetos em andamento: ${projectsInProgress}`);

      // 3. Calcular receita mensal (mês actual)
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      const { data: monthlyRevenuesData } = await this.supabaseAdmin
        .from('revenues')
        .select('amount')
        .gte('invoice_date', monthStartStr);

      const monthlyRevenue = (monthlyRevenuesData || []).reduce(
        (sum, r) => sum + (r.amount || 0),
        0
      );

      this.logger.debug(`  💰 Receita mensal: KZ ${monthlyRevenue.toFixed(2)}`);

      // 4. Calcular receita anual (últimos 12 meses)
      const yearStart = new Date();
      yearStart.setFullYear(yearStart.getFullYear() - 1);
      const yearStartStr = yearStart.toISOString().split('T')[0];

      const { data: yearlyRevenuesData } = await this.supabaseAdmin
        .from('revenues')
        .select('amount')
        .gte('invoice_date', yearStartStr);

      const annualRevenue = (yearlyRevenuesData || []).reduce(
        (sum, r) => sum + (r.amount || 0),
        0
      );

      this.logger.debug(`  💰 Receita anual: KZ ${annualRevenue.toFixed(2)}`);

      // 5. Calcular satisfação média
      const { data: satisfactionData } = await this.supabaseAdmin
        .from('clients')
        .select('satisfaction_score')
        .not('satisfaction_score', 'is', null);

      const avgSatisfaction =
        satisfactionData && satisfactionData.length > 0
          ? satisfactionData.reduce((sum, c) => sum + (c.satisfaction_score || 0), 0) /
            satisfactionData.length
          : 0;

      this.logger.debug(`  ⭐ Satisfação média: ${avgSatisfaction.toFixed(2)}`);

      // 6. Inserir/atualizar snapshot
      const snapshotData = {
        snapshot_date: snapshotDate,
        active_clients: activeClients || 0,
        projects_in_progress: projectsInProgress || 0,
        monthly_revenue: monthlyRevenue,
        annual_revenue: annualRevenue,
        avg_satisfaction_score: parseFloat(avgSatisfaction.toFixed(2)),
      };

      const { error } = await this.supabaseAdmin
        .from('metrics_snapshots')
        .upsert(snapshotData, { onConflict: 'snapshot_date' });

      if (error) {
        throw new Error(`Erro ao inserir snapshot: ${error.message}`);
      }

      this.logger.info(`✅ Snapshot de métricas inserido para ${snapshotDate}`);

      // 7. Limpar dados antigos (retention policy)
      await this.cleanupOldMetrics();

      return snapshotData;
    } catch (error) {
      this.logger.error(`❌ Erro ao agregar métricas:`, error);
      throw error;
    }
  }

  /**
   * Obter últimas N métricas
   */
  async getRecentMetrics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabaseAdmin
        .from('metrics_snapshots')
        .select('*')
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.logger.error(`Erro ao buscar métricas recentes:`, error);
      throw error;
    }
  }

  /**
   * Calcular tendências (comparar períodos)
   */
  async calculateTrends(metricName, days = 30) {
    try {
      const metrics = await this.getRecentMetrics(days);

      if (metrics.length < 2) {
        return null;
      }

      const values = metrics.map((m) => m[metricName] || 0);
      const firstValue = values[0];
      const lastValue = values[values.length - 1];

      const change = lastValue - firstValue;
      const percentChange = firstValue !== 0 ? (change / firstValue) * 100 : 0;
      const trend = change >= 0 ? 'up' : 'down';

      return {
        metric: metricName,
        firstValue,
        lastValue,
        change,
        percentChange: parseFloat(percentChange.toFixed(2)),
        trend,
      };
    } catch (error) {
      this.logger.error(`Erro ao calcular tendências:`, error);
      return null;
    }
  }

  /**
   * Limpar métricas antigas (retention policy)
   */
  async cleanupOldMetrics() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const { data, error: deleteError } = await this.supabaseAdmin
        .from('metrics_snapshots')
        .delete()
        .lt('snapshot_date', cutoffDate.toISOString().split('T')[0]);

      if (deleteError) {
        this.logger.warn(`⚠️  Erro ao limpar métricas antigas:`, deleteError);
        return;
      }

      this.logger.debug(
        `🧹 Limpeza: removidas métricas anteriores a ${cutoffDate.toISOString().split('T')[0]}`
      );
    } catch (error) {
      this.logger.warn(`Erro ao fazer cleanup de métricas:`, error);
    }
  }

  /**
   * Exportar métricas para CSV
   */
  async exportToCSV(days = 30) {
    try {
      const metrics = await this.getRecentMetrics(days);

      if (metrics.length === 0) {
        return '';
      }

      // Header
      const headers = Object.keys(metrics[0]);
      const csvHeaders = headers.join(',');

      // Rows
      const csvRows = metrics.map((m) =>
        headers.map((h) => {
          const value = m[h];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      );

      return [csvHeaders, ...csvRows].join('\n');
    } catch (error) {
      this.logger.error(`Erro ao exportar CSV:`, error);
      return '';
    }
  }
}

export default MetricsAggregator;
