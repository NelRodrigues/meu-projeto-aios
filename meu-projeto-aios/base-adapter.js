/**
 * @fileoverview Base class for data source adapters
 *
 * Este ficheiro define a classe base DataSourceAdapter que todos os adaptadores
 * de fontes externas devem estender.
 *
 * Padrão inspirado em: .aios-core/infrastructure/scripts/pm-adapter.js
 */

/**
 * Classe base para adaptadores de fontes de dados externas
 *
 * Todos os adaptadores (Zoho CRM, Google Sheets, Contabilidade, etc.)
 * devem estender esta classe e implementar os métodos abstractos.
 */
export class DataSourceAdapter {
  /**
   * Criar instância de adaptador
   * @param {object} config - Configuração específica do adaptador
   */
  constructor(config = {}) {
    this.config = config;
    this.lastSyncTime = null;
    this.lastError = null;
  }

  /**
   * Testar conexão com a fonte de dados externa
   *
   * Valida que o adaptador consegue conectar à fonte de dados
   * com a configuração fornecida.
   *
   * @returns {Promise<{success: boolean, error?: string}>}
   * @throws {Error} Se não implementado por subclass
   *
   * @example
   * const result = await adapter.testConnection();
   * if (!result.success) {
   *   console.error('Conexão falhou:', result.error);
   * }
   */
  async testConnection() {
    throw new Error('testConnection deve ser implementado pelo adaptador');
  }

  /**
   * Buscar dados da fonte externa
   *
   * Retrieves data from the external source based on options.
   *
   * @param {object} options - Opções de fetch (filtros, paginação, etc.)
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   * @throws {Error} Se não implementado por subclass
   *
   * @example
   * const result = await adapter.fetchData({ limit: 100 });
   * if (result.success) {
   *   console.log('Dados recebidos:', result.data.length);
   * }
   */
  async fetchData(_options = {}) {
    throw new Error('fetchData deve ser implementado pelo adaptador');
  }

  /**
   * Normalizar dados da fonte externa para formato interno
   *
   * Transforma os dados brutos da fonte externa para o formato
   * que será armazenado na base de dados interna.
   *
   * @param {any} rawData - Dados brutos da fonte
   * @returns {array} Dados normalizados
   * @throws {Error} Se não implementado por subclass
   *
   * @example
   * const normalized = adapter.normalizeData(zohoResponse);
   * // normalized = [{ name: '...', email: '...', tier: 'gold' }, ...]
   */
  normalizeData(_rawData) {
    throw new Error('normalizeData deve ser implementado pelo adaptador');
  }

  /**
   * Sincronizar dados com base de dados interna
   *
   * Executa o ciclo completo: fetch → normalize → save
   *
   * @param {object} db - Instância de cliente de base de dados (Supabase)
   * @param {string} tableName - Nome da tabela destino
   * @returns {Promise<{success: boolean, recordsSynced: number, error?: string}>}
   *
   * @example
   * const result = await adapter.sync(supabase, 'clients');
   * console.log(`${result.recordsSynced} clientes sincronizados`);
   */
  async sync(db, tableName) {
    try {
      console.log(`📡 Iniciando sync de ${this.getName()}...`);

      // Fetch dados da fonte
      const fetchResult = await this.fetchData();
      if (!fetchResult.success) {
        throw new Error(fetchResult.error || 'Falha ao buscar dados');
      }

      // Normalizar dados
      const normalizedData = this.normalizeData(fetchResult.data);

      // Salvar na base de dados
      if (!db || !tableName) {
        console.log(`⚠️  Sem base de dados fornecida, dados não foram salvos`);
        return {
          success: true,
          recordsSynced: normalizedData.length,
          note: 'Dados normalizados mas não salvos (DB não configurado)'
        };
      }

      // Upsert dos dados
      let recordsSynced = 0;
      for (const record of normalizedData) {
        try {
          // Se há external_id, fazer upsert por esse campo
          if (record.external_id) {
            const { error } = await db
              .from(tableName)
              .upsert([record], { onConflict: 'external_id' });
            if (error) throw error;
          } else {
            // Caso contrário, fazer insert
            const { error } = await db
              .from(tableName)
              .insert([record]);
            if (error && !error.message.includes('duplicate')) {
              throw error;
            }
          }
          recordsSynced++;
        } catch (error) {
          console.warn(`⚠️  Erro ao salvar record ${record.name}:`, error.message);
        }
      }

      this.lastSyncTime = new Date();

      console.log(`✅ Sync completo: ${recordsSynced}/${normalizedData.length} registos salvos`);

      return {
        success: true,
        recordsSynced,
        timestamp: this.lastSyncTime
      };
    } catch (error) {
      this.lastError = error;
      console.error(`❌ Erro ao sincronizar ${this.getName()}:`, error.message);
      return {
        success: false,
        error: error.message,
        recordsSynced: 0
      };
    }
  }

  /**
   * Obter nome do adaptador
   * @returns {string} Nome do adaptador (ex: 'Zoho CRM', 'Google Sheets')
   */
  getName() {
    return this.constructor.name.replace('Adapter', '');
  }

  /**
   * Obter status do adaptador
   * @returns {object} Status com última sincronização e erros
   */
  getStatus() {
    return {
      name: this.getName(),
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError ? this.lastError.message : null,
      configured: this.isConfigured()
    };
  }

  /**
   * Verificar se adaptador está configurado
   * @returns {boolean}
   */
  isConfigured() {
    // Implementar em subclasses
    return Object.keys(this.config).length > 0;
  }
}

export default DataSourceAdapter;
