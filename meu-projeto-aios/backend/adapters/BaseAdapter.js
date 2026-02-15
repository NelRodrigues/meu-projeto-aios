/**
 * Base Adapter Class - Padrão AIOS para integrações de dados
 * Inspirado em: .aios-core/infrastructure/scripts/pm-adapter.js
 */

export class BaseAdapter {
  constructor(config, logger = console) {
    this.config = config;
    this.logger = logger;
    this.name = this.constructor.name;
    this.lastSyncTime = null;
    this.syncInProgress = false;
  }

  /**
   * Obter nome do adaptador
   */
  getName() {
    return this.name;
  }

  /**
   * Testar conexão com fonte de dados
   * @abstract
   */
  async testConnection() {
    throw new Error(`${this.name}.testConnection() não implementado`);
  }

  /**
   * Buscar dados brutos da fonte externa
   * @abstract
   */
  async fetchData(options = {}) {
    throw new Error(`${this.name}.fetchData() não implementado`);
  }

  /**
   * Normalizar dados para formato interno
   * @abstract
   */
  normalizeData(rawData) {
    throw new Error(`${this.name}.normalizeData() não implementado`);
  }

  /**
   * Mapear dados normalizados para formato de banco de dados
   * @abstract
   */
  async mapToDatabase(normalizedData) {
    throw new Error(`${this.name}.mapToDatabase() não implementado`);
  }

  /**
   * Salvar dados no banco (implementado pela subclasse)
   * @abstract
   */
  async saveToDatabase(mappedData) {
    throw new Error(`${this.name}.saveToDatabase() não implementado`);
  }

  /**
   * Ciclo completo de sincronização
   */
  async sync(options = {}) {
    const startTime = Date.now();

    try {
      if (this.syncInProgress) {
        this.logger.warn(`${this.name}: Sync já em andamento, pulando...`);
        return { success: false, error: 'Sync já em andamento' };
      }

      this.syncInProgress = true;
      this.logger.info(`🔄 Iniciando sync de ${this.name}...`);

      // 1. Testar conexão
      this.logger.debug(`Testando conexão com ${this.name}...`);
      await this.testConnection();
      this.logger.info(`✅ Conexão com ${this.name} OK`);

      // 2. Buscar dados
      this.logger.debug(`Buscando dados de ${this.name}...`);
      const rawData = await this.fetchData(options);
      this.logger.info(`✅ ${rawData.length || 0} registos buscados`);

      if (!rawData || rawData.length === 0) {
        this.logger.warn(`⚠️  Nenhum dado retornado de ${this.name}`);
        return { success: true, recordsSynced: 0 };
      }

      // 3. Normalizar dados
      this.logger.debug(`Normalizando dados de ${this.name}...`);
      const normalizedData = this.normalizeData(rawData);
      this.logger.info(`✅ ${normalizedData.length} registos normalizados`);

      // 4. Mapear para banco de dados
      this.logger.debug(`Mapeando dados para banco de dados...`);
      const mappedData = await this.mapToDatabase(normalizedData);
      this.logger.info(`✅ Dados mapeados com sucesso`);

      // 5. Salvar no banco
      this.logger.debug(`Salvando dados no banco...`);
      const result = await this.saveToDatabase(mappedData);
      this.logger.info(`✅ ${result.recordsSynced} registos salvos`);

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      this.logger.info(
        `✨ Sync de ${this.name} concluído em ${duration}ms\n` +
        `   Registos: ${result.recordsSynced} | Erros: ${result.errors?.length || 0}`
      );

      return {
        success: true,
        recordsSynced: result.recordsSynced,
        errors: result.errors || [],
        duration,
      };
    } catch (error) {
      this.logger.error(`❌ Erro ao sincronizar ${this.name}:`, error.message);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Obter status do adaptador
   */
  getStatus() {
    return {
      name: this.name,
      configured: !!this.config,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
    };
  }
}

export default BaseAdapter;
