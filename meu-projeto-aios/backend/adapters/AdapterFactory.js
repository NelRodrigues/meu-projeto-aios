/**
 * Adapter Factory
 * Cria instâncias de adaptadores dinamicamente
 */

import { ZohoCRMAdapter } from './ZohoCRMAdapter.js';
import { GoogleSheetsAdapter } from './GoogleSheetsAdapter.js';
import { AccountingAdapter } from './AccountingAdapter.js';

export class AdapterFactory {
  static adapters = {
    'zoho-crm': ZohoCRMAdapter,
    'google-sheets': GoogleSheetsAdapter,
    'accounting': AccountingAdapter,
  };

  /**
   * Registar novo tipo de adaptador
   */
  static register(name, adapterClass) {
    this.adapters[name] = adapterClass;
  }

  /**
   * Criar instância de adaptador
   */
  static createAdapter(type, config, supabaseAdmin, logger = console) {
    const AdapterClass = this.adapters[type];

    if (!AdapterClass) {
      throw new Error(
        `Adaptador desconhecido: ${type}. ` +
        `Tipos disponíveis: ${Object.keys(this.adapters).join(', ')}`
      );
    }

    if (!config) {
      throw new Error(`Configuração obrigatória para ${type}`);
    }

    try {
      return new AdapterClass(config, supabaseAdmin, logger);
    } catch (error) {
      throw new Error(
        `Erro ao criar adaptador ${type}: ${error.message}`
      );
    }
  }

  /**
   * Listar tipos de adaptadores disponíveis
   */
  static getAvailableAdapters() {
    return Object.keys(this.adapters);
  }

  /**
   * Criar e testar adaptador
   */
  static async createAndTest(type, config, supabaseAdmin, logger = console) {
    logger.info(`🔧 Criando adaptador ${type}...`);

    const adapter = this.createAdapter(type, config, supabaseAdmin, logger);

    logger.info(`📡 Testando conexão de ${type}...`);
    await adapter.testConnection();

    logger.info(`✅ Adaptador ${type} pronto para usar`);

    return adapter;
  }
}

export default AdapterFactory;
