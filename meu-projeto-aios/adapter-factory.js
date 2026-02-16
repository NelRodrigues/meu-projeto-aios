/**
 * @fileoverview Factory for creating data source adapters
 *
 * Factory pattern para instantiar adaptadores dinamicamente
 */

import ZohoCRMAdapter from './zoho-crm-adapter.js';
import GoogleSheetsAdapter from './google-sheets-adapter.js';
import ClickUpAdapter from './clickup-adapter.js';

/**
 * Factory para criar adaptadores de fontes de dados
 */
export class AdapterFactory {
  /**
   * Tipos de adaptadores suportados
   */
  static TYPES = {
    ZOHO_CRM: 'zoho-crm',
    GOOGLE_SHEETS: 'google-sheets',
    CLICKUP: 'clickup'
  };

  /**
   * Criar adaptador pelo tipo
   *
   * @param {string} type - Tipo de adaptador (zoho-crm, google-sheets)
   * @param {object} config - Configuração do adaptador
   * @returns {DataSourceAdapter}
   * @throws {Error} Se tipo inválido
   *
   * @example
   * const adapter = AdapterFactory.createAdapter('zoho-crm', {
   *   accessToken: 'xxx',
   *   organizationId: 'yyy'
   * });
   */
  static createAdapter(type, config = {}) {
    switch (type) {
      case this.TYPES.ZOHO_CRM:
        return new ZohoCRMAdapter(config);

      case this.TYPES.GOOGLE_SHEETS:
        return new GoogleSheetsAdapter(config);

      case this.TYPES.CLICKUP:
        return new ClickUpAdapter(config);

      default:
        throw new Error(`Tipo de adaptador desconhecido: ${type}`);
    }
  }

  /**
   * Criar múltiplos adaptadores
   *
   * @param {object} configs - Objeto com tipo => configuração
   * @returns {Map<string, DataSourceAdapter>}
   *
   * @example
   * const adapters = AdapterFactory.createMultiple({
   *   'zoho-crm': { accessToken: '...' },
   *   'google-sheets': { spreadsheetId: '...' }
   * });
   */
  static createMultiple(configs) {
    const adapters = new Map();

    for (const [type, config] of Object.entries(configs)) {
      try {
        adapters.set(type, this.createAdapter(type, config));
      } catch (error) {
        console.warn(`⚠️  Erro ao criar adaptador ${type}:`, error.message);
      }
    }

    return adapters;
  }

  /**
   * Listar tipos de adaptadores disponíveis
   */
  static listAvailableTypes() {
    return Object.values(this.TYPES);
  }
}

export default AdapterFactory;
