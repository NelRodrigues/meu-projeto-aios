/**
 * Accounting Adapter
 * Integração genérica para APIs REST de ferramentas de contabilidade
 * Suporta: QuickBooks, Xero, Nuvem Fiscal, etc.
 */

import axios from 'axios';
import { BaseAdapter } from './BaseAdapter.js';

export class AccountingAdapter extends BaseAdapter {
  constructor(config, supabaseAdmin, logger = console) {
    super(config, logger);
    this.supabaseAdmin = supabaseAdmin;
    this.name = 'AccountingAdapter';

    // Validar config
    if (!config.apiUrl) {
      throw new Error('API URL é obrigatória no config');
    }
  }

  /**
   * Testar conexão com API de contabilidade
   */
  async testConnection() {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/health` || `${this.config.apiUrl}/ping`,
        {
          headers: this.getHeaders(),
          timeout: 5000,
        }
      );

      if (response.status >= 200 && response.status < 300) {
        this.logger.info('✅ Conexão com API de Contabilidade OK');
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Falha ao conectar API de contabilidade: ${error.message}`);
    }
  }

  /**
   * Buscar receitas (invoices/sales)
   */
  async fetchData(options = {}) {
    const endpoint = options.endpoint || '/invoices';
    const filters = options.filters || {
      status: 'paid,unpaid,overdue', // Configurável
      limit: 100,
    };

    try {
      this.logger.debug(`Buscando dados de ${endpoint}...`);

      const response = await axios.get(
        `${this.config.apiUrl}${endpoint}`,
        {
          headers: this.getHeaders(),
          params: filters,
        }
      );

      // Normalizar resposta (pode variar por API)
      const data = response.data.data || response.data.invoices || response.data;

      if (!Array.isArray(data)) {
        this.logger.warn(`⚠️  Resposta inesperada da API`);
        return [];
      }

      this.logger.info(`✅ ${data.length} receitas buscadas`);
      return data;
    } catch (error) {
      throw new Error(`Erro ao buscar receitas: ${error.message}`);
    }
  }

  /**
   * Normalizar dados de contabilidade
   */
  normalizeData(rawData) {
    return rawData.map((record) => {
      // Mapear para campos conhecidos (variam por API)
      const customerName =
        record.customer_name ||
        record.customerName ||
        record.customer?.name ||
        record.entity?.name ||
        'Unknown';

      const amount = parseFloat(
        record.total || record.amount || record.grand_total || 0
      );

      const status = (record.status || 'pending').toLowerCase();

      // Tentar parsear data
      const invoiceDate = this.parseDate(
        record.invoice_date ||
        record.invoiceDate ||
        record.date ||
        record.issued_date
      );

      const paidDate = this.parseDate(
        record.paid_date ||
        record.paidDate ||
        record.paid_on
      );

      return {
        customerName,
        amount,
        status: this.normalizeStatus(status),
        invoiceDate,
        paidDate,
        invoiceNumber: record.invoice_number || record.invoiceNumber || '',
        type: this.getInvoiceType(record),
        metadata: {
          invoiceId: record.id || record.invoice_id,
          url: record.url || record.html_url,
          notes: record.notes || record.memo || '',
        },
      };
    });
  }

  /**
   * Mapear para formato de banco de dados
   */
  async mapToDatabase(normalizedData) {
    // Buscar clientes pelo nome
    const mappedData = [];

    for (const item of normalizedData) {
      try {
        const { data: clients } = await this.supabaseAdmin
          .from('clients')
          .select('id')
          .ilike('name', `%${item.customerName}%`)
          .limit(1);

        if (!clients || clients.length === 0) {
          this.logger.warn(`⚠️  Cliente não encontrado: ${item.customerName}`);
          continue;
        }

        mappedData.push({
          client_id: clients[0].id,
          amount: item.amount,
          type: item.type,
          status: item.status,
          invoice_date: item.invoiceDate,
          paid_date: item.paidDate,
          metadata: item.metadata,
        });
      } catch (err) {
        this.logger.warn(`⚠️  Erro ao mapear ${item.customerName}:`, err.message);
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
            this.logger.warn(`⚠️  Erro ao inserir receita: ${error.message}`);
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
        `✅ Inseridas ${recordsSynced}/${mappedData.length} receitas`
      );

      return { recordsSynced, errors };
    } catch (error) {
      throw new Error(`Erro ao salvar receitas: ${error.message}`);
    }
  }

  /**
   * Obter headers para requisição
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      // Suporta vários formatos de autenticação
      if (this.config.authType === 'bearer') {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      } else if (this.config.authType === 'apikey') {
        headers['X-API-Key'] = this.config.apiKey;
        headers['API-Key'] = this.config.apiKey;
      } else {
        // Padrão: Bearer
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
    }

    return headers;
  }

  /**
   * Normalizar status de invoice
   */
  normalizeStatus(status) {
    if (status.includes('paid')) return 'received';
    if (status.includes('pending')) return 'pending';
    if (status.includes('overdue')) return 'overdue';
    if (status.includes('draft')) return 'pending';
    return 'pending';
  }

  /**
   * Obter tipo de invoice
   */
  getInvoiceType(record) {
    // Tentar identificar se é recorrente
    const isRecurring =
      record.is_recurring ||
      record.recurring ||
      (record.type && record.type.includes('recurring'));

    return isRecurring ? 'recurring' : 'one_time';
  }

  /**
   * Parsear data
   */
  parseDate(dateString) {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (err) {
      // Ignorar erros de parsing
    }

    return null;
  }
}

export default AccountingAdapter;
