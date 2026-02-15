/**
 * Google Sheets Adapter
 * Importar receitas e dados de Google Sheets/Excel
 */

import axios from 'axios';
import { BaseAdapter } from './BaseAdapter.js';

export class GoogleSheetsAdapter extends BaseAdapter {
  constructor(config, supabaseAdmin, logger = console) {
    super(config, logger);
    this.supabaseAdmin = supabaseAdmin;
    this.name = 'GoogleSheetsAdapter';
  }

  /**
   * Testar conexão com Google Sheets
   */
  async testConnection() {
    try {
      // Se usando API key, testar acesso à folha
      if (this.config.apiKey && this.config.spreadsheetId) {
        const url =
          `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}` +
          `?key=${this.config.apiKey}`;

        const response = await axios.get(url);

        if (!response.data.spreadsheetId) {
          throw new Error('Spreadsheet não encontrado');
        }

        this.logger.info('✅ Conexão com Google Sheets OK');
      } else {
        throw new Error('API key ou spreadsheet ID não configurados');
      }
    } catch (error) {
      throw new Error(`Falha ao conectar a Google Sheets: ${error.message}`);
    }
  }

  /**
   * Buscar dados de uma aba específica do Sheets
   */
  async fetchData(options = {}) {
    const sheetName = options.sheetName || 'Receitas';
    const range = options.range || `${sheetName}!A:K`; // Até coluna K

    try {
      this.logger.debug(`Buscando dados de ${sheetName}...`);

      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${range}` +
        `?key=${this.config.apiKey}&majorDimension=ROWS`;

      const response = await axios.get(url);

      if (!response.data.values || response.data.values.length === 0) {
        this.logger.warn(`⚠️  Nenhum dado em ${sheetName}`);
        return [];
      }

      // Primeira linha é header
      const [headers, ...rows] = response.data.values;

      this.logger.debug(`Headers encontrados: ${headers.join(', ')}`);
      this.logger.info(`✅ ${rows.length} registos buscados de ${sheetName}`);

      return { headers, rows };
    } catch (error) {
      throw new Error(`Erro ao buscar dados de Google Sheets: ${error.message}`);
    }
  }

  /**
   * Normalizar dados do Google Sheets
   */
  normalizeData(rawData) {
    const { headers, rows } = rawData;

    // Mapear índices de colunas (assumir estrutura padrão)
    const headerMap = {};
    headers.forEach((header, index) => {
      headerMap[header.toLowerCase().trim()] = index;
    });

    this.logger.debug('Header map:', headerMap);

    // Processar linhas
    return rows.map((row, idx) => {
      try {
        return {
          clientName: row[headerMap['cliente'] || headerMap['company'] || 0] || 'Unknown',
          amount: parseFloat(row[headerMap['valor'] || headerMap['amount'] || 1] || 0),
          type: (row[headerMap['tipo'] || headerMap['type'] || 2] || 'recurring').toLowerCase(),
          status: (row[headerMap['status'] || 3] || 'pending').toLowerCase(),
          invoiceDate: row[headerMap['data_fatura'] || headerMap['invoice_date'] || 4] || null,
          paidDate: row[headerMap['data_pagamento'] || headerMap['paid_date'] || 5] || null,
          description: row[headerMap['descrição'] || headerMap['description'] || 6] || '',
          rowIndex: idx,
        };
      } catch (err) {
        this.logger.warn(`⚠️  Erro ao processar linha ${idx}:`, err.message);
        return null;
      }
    }).filter(Boolean); // Remover nulls
  }

  /**
   * Mapear para formato de banco de dados
   */
  async mapToDatabase(normalizedData) {
    // Buscar cliente pelo nome para obter ID
    const mappedData = [];

    for (const item of normalizedData) {
      try {
        // Buscar cliente
        const { data: clients } = await this.supabaseAdmin
          .from('clients')
          .select('id')
          .ilike('name', `%${item.clientName}%`)
          .limit(1);

        if (!clients || clients.length === 0) {
          this.logger.warn(
            `⚠️  Cliente não encontrado: ${item.clientName} (linha ${item.rowIndex})`
          );
          continue;
        }

        mappedData.push({
          client_id: clients[0].id,
          amount: item.amount,
          type: item.type,
          status: item.status,
          invoice_date: this.parseDate(item.invoiceDate),
          paid_date: this.parseDate(item.paidDate),
          metadata: {
            description: item.description,
            source: 'google_sheets',
          },
        });
      } catch (err) {
        this.logger.warn(`⚠️  Erro ao mapear cliente ${item.clientName}:`, err.message);
      }
    }

    return mappedData;
  }

  /**
   * Salvar dados no Supabase
   */
  async saveToDatabase(mappedData) {
    const errors = [];
    let recordsSynced = 0;

    try {
      for (const record of mappedData) {
        try {
          const { error } = await this.supabaseAdmin
            .from('revenues')
            .insert(record);

          if (error) {
            errors.push({
              clientId: record.client_id,
              error: error.message,
            });
            this.logger.warn(
              `⚠️  Erro ao inserir receita: ${error.message}`
            );
          } else {
            recordsSynced++;
          }
        } catch (err) {
          errors.push({
            clientId: record.client_id,
            error: err.message,
          });
        }
      }

      this.logger.info(
        `✅ Inseridas ${recordsSynced}/${mappedData.length} receitas no banco`
      );

      return { recordsSynced, errors };
    } catch (error) {
      throw new Error(`Erro ao salvar receitas no banco: ${error.message}`);
    }
  }

  /**
   * Parsear data de vários formatos
   */
  parseDate(dateString) {
    if (!dateString) return null;

    // Tentar vários formatos
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
    ];

    for (const format of formats) {
      if (format.test(dateString)) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    this.logger.warn(`⚠️  Formato de data não reconhecido: ${dateString}`);
    return null;
  }
}

export default GoogleSheetsAdapter;
