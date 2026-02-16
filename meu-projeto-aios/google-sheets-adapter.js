/**
 * @fileoverview Google Sheets Adapter for syncing revenue data
 *
 * Integra com Google Sheets para importar dados de receitas
 * Reutiliza o MCP Google Workspace existente no AIOS
 */

import DataSourceAdapter from './base-adapter.js';

/**
 * Adaptador para Google Sheets
 *
 * Funcionalidades:
 * - Leitura de dados de Google Sheets
 * - Normalização de colunas para campos internos
 * - Suporte a múltiplas planilhas
 * - Cache de dados
 */
export class GoogleSheetsAdapter extends DataSourceAdapter {
  constructor(config = {}) {
    super(config);

    // Configuração necessária
    this.spreadsheetId = config.spreadsheetId || process.env.GOOGLE_SHEETS_ID;
    this.sheetName = config.sheetName || 'Receitas';
    this.apiKey = config.apiKey || process.env.GOOGLE_SHEETS_API_KEY;
    this.serviceAccount = config.serviceAccount || process.env.GOOGLE_SERVICE_ACCOUNT;

    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  }

  /**
   * Testar conexão com Google Sheets
   */
  async testConnection() {
    try {
      if (!this.spreadsheetId) {
        return {
          success: false,
          error: 'Spreadsheet ID não configurado. Configure GOOGLE_SHEETS_ID.'
        };
      }

      if (!this.apiKey) {
        return {
          success: false,
          error: 'API key não configurada. Configure GOOGLE_SHEETS_API_KEY.'
        };
      }

      // Testar acesso a metadados da planilha
      const url = `${this.baseUrl}/${this.spreadsheetId}?key=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Spreadsheet não encontrado (ID inválido?)'
          };
        }
        if (response.status === 403) {
          return {
            success: false,
            error: 'Acesso negado (chave API inválida?)'
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        spreadsheetTitle: data.properties.title,
        sheetCount: data.sheets.length,
        sheets: data.sheets.map(s => s.properties.title)
      };
    } catch (error) {
      console.error('❌ Erro ao testar Google Sheets:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar dados do Google Sheets
   */
  async fetchData(options = {}) {
    try {
      if (!this.spreadsheetId || !this.apiKey) {
        return {
          success: false,
          error: 'Configuração incompleta (ID ou API key faltando)'
        };
      }

      const range = options.range || `${this.sheetName}!A:H`; // A-H: nome, email, receita, etc

      console.log(`📊 Buscando dados de ${range}...`);

      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${encodeURIComponent(range)}?key=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.values || data.values.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Converter linhas em objetos usando header
      const [headers, ...rows] = data.values;
      const records = rows.map(row => {
        const record = {};
        headers.forEach((header, index) => {
          record[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || null;
        });
        return record;
      });

      console.log(`✅ ${records.length} linhas importadas do Google Sheets`);

      return {
        success: true,
        data: records
      };
    } catch (error) {
      console.error('❌ Erro ao buscar Google Sheets:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Normalizar dados do Google Sheets
   *
   * Espera colunas: nome_cliente, email, valor_mensal, tipo_contrato, data_inicio
   */
  normalizeData(sheetRecords) {
    if (!sheetRecords || sheetRecords.length === 0) {
      return [];
    }

    return sheetRecords
      .filter(record => record.nome_cliente && record.valor_mensal) // Filtrar registos válidos
      .map((record, index) => {
        const monthlyValue = parseFloat(record.valor_mensal) || 0;
        const tier = monthlyValue > 5000 ? 'platinum' : monthlyValue > 2000 ? 'gold' : 'silver';

        return {
          external_id: `SHEETS-${index}-${record.nome_cliente}`, // ID único baseado em Google Sheets
          name: record.nome_cliente.trim(),
          email: record.email || null,
          tier,
          status: 'active',
          monthly_value: monthlyValue,
          satisfaction_score: 8, // Default
          metadata: {
            source: 'Google Sheets',
            contract_type: record.tipo_contrato || 'retainer',
            start_date: record.data_inicio || null,
            notes: record.notas || null,
            imported_from_sheets: true
          }
        };
      });
  }

  /**
   * Sincronizar receitas (cria/actualiza registos na tabela revenues)
   */
  async syncRevenues(db) {
    try {
      const fetchResult = await this.fetchData();
      if (!fetchResult.success) {
        return {
          success: false,
          error: fetchResult.error
        };
      }

      const records = this.normalizeData(fetchResult.data);
      let revenuesSynced = 0;

      // Sync de receitas (tabela revenues)
      for (const record of records) {
        try {
          // Buscar cliente existente
          const { data: client } = await db
            .from('clients')
            .select('id')
            .eq('email', record.email)
            .single();

          if (client) {
            // Criar receita para este cliente
            const { error } = await db
              .from('revenues')
              .insert([{
                client_id: client.id,
                amount: record.monthly_value,
                type: record.metadata.contract_type,
                status: 'received',
                invoice_date: new Date().toISOString().split('T')[0]
              }]);

            if (!error) {
              revenuesSynced++;
            }
          }
        } catch (error) {
          console.warn(`⚠️  Erro ao sincronizar receita ${record.name}:`, error.message);
        }
      }

      this.lastSyncTime = new Date();

      return {
        success: true,
        recordsSynced: revenuesSynced,
        timestamp: this.lastSyncTime
      };
    } catch (error) {
      console.error('❌ Erro ao sincronizar receitas:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar se está configurado
   */
  isConfigured() {
    return !!(this.spreadsheetId && this.apiKey);
  }
}

export default GoogleSheetsAdapter;
