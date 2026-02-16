/**
 * @fileoverview Data synchronization orchestrator with cron jobs
 *
 * Orquestra a sincronização de dados de múltiplas fontes externas
 * com cron jobs automáticos.
 */

import cron from 'node-cron';
import AdapterFactory from './adapter-factory.js';

/**
 * Orquestrador de sincronização de dados
 */
export class DataSyncOrchestrator {
  constructor(supabaseClient, supabaseAdminClient = null) {
    this.db = supabaseAdminClient || supabaseClient; // Usar admin client se disponível, senão usar client normal
    this.supabasePublic = supabaseClient; // Guardar client público para queries de leitura
    this.adapters = new Map();
    this.jobs = new Map();
    this.syncLogs = [];
  }

  /**
   * Registar um adaptador
   */
  registerAdapter(name, adapter) {
    this.adapters.set(name, adapter);
    console.log(`✅ Adaptador registado: ${name}`);
  }

  /**
   * Criar adaptador e registar
   */
  addAdapter(name, type, config) {
    try {
      const adapter = AdapterFactory.createAdapter(type, config);
      this.registerAdapter(name, adapter);
      return adapter;
    } catch (error) {
      console.error(`❌ Erro ao adicionar adaptador ${name}:`, error.message);
      return null;
    }
  }

  /**
   * Sincronizar um adaptador específico
   */
  async syncAdapter(adapterName, tableName) {
    try {
      const adapter = this.adapters.get(adapterName);
      if (!adapter) {
        throw new Error(`Adaptador não encontrado: ${adapterName}`);
      }

      console.log(`\n📡 [${new Date().toLocaleString()}] Sincronizando ${adapterName}...`);

      // Log de início
      const syncStartTime = new Date();
      const { data: logEntry } = await this.db
        .from('data_sync_logs')
        .insert([{
          source: adapterName,
          status: 'running',
          started_at: syncStartTime.toISOString()
        }])
        .select()
        .single();

      // Testar conexão
      const testResult = await adapter.testConnection();
      if (!testResult.success) {
        console.warn(`⚠️  Teste de conexão falhou: ${testResult.error}`);
        // Continuar mesmo assim
      } else {
        console.log(`✅ Conexão OK: ${testResult.organization || testResult.spreadsheetTitle || 'OK'}`);
      }

      // Executar sync
      const syncResult = await adapter.sync(this.db, tableName);

      // Actualizar log
      const syncEndTime = new Date();
      await this.db
        .from('data_sync_logs')
        .update({
          status: syncResult.success ? 'success' : 'failed',
          records_synced: syncResult.recordsSynced || 0,
          errors: syncResult.error ? [syncResult.error] : [],
          completed_at: syncEndTime.toISOString()
        })
        .eq('id', logEntry?.id);

      if (syncResult.success) {
        console.log(`✅ Sync completo! ${syncResult.recordsSynced} registos sincronizados`);
      } else {
        console.error(`❌ Sync falhou: ${syncResult.error}`);
      }

      // Guardar no histórico local
      this.syncLogs.push({
        timestamp: syncStartTime,
        adapter: adapterName,
        success: syncResult.success,
        recordsSynced: syncResult.recordsSynced,
        error: syncResult.error
      });

      return syncResult;
    } catch (error) {
      console.error(`❌ Erro ao sincronizar ${adapterName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Agendar cron job para adaptador
   *
   * @param {string} adapterName - Nome do adaptador
   * @param {string} tableName - Tabela destino
   * @param {string} schedule - Schedule do cron (ex: cron format para 4h/4h)
   * @param {string} jobName - Nome único do job (opcional)
   *
   * @example
   * orchestrator.scheduleSyncJob('zoho-crm', 'clients', schedule, 'zoho-4h');
   */
  scheduleSyncJob(adapterName, tableName, schedule, jobName) {
    try {
      const name = jobName || `${adapterName}-sync`;

      // Se job já existe, cancelar
      if (this.jobs.has(name)) {
        console.warn(`⚠️  Job ${name} já existe, cancelando anterior...`);
        this.jobs.get(name).stop();
      }

      // Agendar novo job
      const job = cron.schedule(schedule, async () => {
        await this.syncAdapter(adapterName, tableName);
      });

      this.jobs.set(name, job);

      console.log(`✅ Job agendado: ${name} (${schedule})`);

      return job;
    } catch (error) {
      console.error(`❌ Erro ao agendar job ${jobName}:`, error.message);
      return null;
    }
  }

  /**
   * Executar sync manual de um adaptador
   */
  async triggerSync(adapterName, tableName) {
    return await this.syncAdapter(adapterName, tableName);
  }

  /**
   * Sincronizar todos os adaptadores registados
   */
  async syncAll() {
    console.log(`\n🔄 Sincronizando todos os adaptadores (${this.adapters.size})...`);

    const results = {};
    for (const [name] of this.adapters) {
      // Determinar tabela baseada no tipo
      let table = 'clients'; // default
      if (name.includes('sheets') || name.includes('revenue')) {
        table = 'revenues';
      }

      results[name] = await this.syncAdapter(name, table);
    }

    return results;
  }

  /**
   * Parar todos os jobs
   */
  stopAllJobs() {
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`⏹️  Job parado: ${name}`);
    }
    this.jobs.clear();
  }

  /**
   * Obter status de todos os adaptadores
   */
  getStatus() {
    const status = {
      adapters: {},
      jobs: [],
      lastSyncs: this.syncLogs.slice(-5)
    };

    for (const [name, adapter] of this.adapters) {
      status.adapters[name] = adapter.getStatus();
    }

    for (const [name, job] of this.jobs) {
      status.jobs.push({
        name,
        status: 'running'
      });
    }

    return status;
  }

  /**
   * Obter histórico de syncs
   */
  getSyncHistory(limit = 20) {
    return this.syncLogs.slice(-limit);
  }
}

export default DataSyncOrchestrator;
