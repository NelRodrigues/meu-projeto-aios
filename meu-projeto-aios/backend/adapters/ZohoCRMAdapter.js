/**
 * Zoho CRM Adapter
 * Integração com Zoho CRM API para sincronizar clientes
 */

import axios from 'axios';
import { BaseAdapter } from './BaseAdapter.js';

export class ZohoCRMAdapter extends BaseAdapter {
  constructor(config, supabaseAdmin, logger = console) {
    super(config, logger);
    this.supabaseAdmin = supabaseAdmin;
    this.name = 'ZohoCRMAdapter';

    // URLs base por região
    const regionUrls = {
      com: 'https://www.zohoapis.com',
      eu: 'https://www.zohoapis.eu',
      cn: 'https://www.zohoapis.com.cn',
      in: 'https://www.zohoapis.in',
    };

    this.baseUrl = regionUrls[config.region || 'com'];
    this.accessToken = null;
    this.accessTokenExpiresAt = null;
  }

  /**
   * Obter ou renovar access token (OAuth 2.0)
   */
  async getAccessToken() {
    // Se token ainda é válido, retornar
    if (this.accessToken && this.accessTokenExpiresAt > Date.now()) {
      return this.accessToken;
    }

    this.logger.debug('Renovando access token do Zoho CRM...');

    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth/v2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
        })
      );

      this.accessToken = response.data.access_token;
      // Token válido por 3600 segundos, renovar 5 minutos antes
      this.accessTokenExpiresAt = Date.now() + (3600 - 300) * 1000;

      this.logger.debug('✅ Access token renovado');
      return this.accessToken;
    } catch (error) {
      throw new Error(`Erro ao renovar token Zoho: ${error.message}`);
    }
  }

  /**
   * Testar conexão com Zoho CRM
   */
  async testConnection() {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/crm/v2/modules`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error(`Status: ${response.status}`);
      }

      this.logger.info('✅ Conexão com Zoho CRM OK');
    } catch (error) {
      throw new Error(`Falha ao conectar a Zoho CRM: ${error.message}`);
    }
  }

  /**
   * Buscar clientes (Accounts) do Zoho CRM
   */
  async fetchData(options = {}) {
    const token = await this.getAccessToken();
    const pageSize = 200; // Limite máximo do Zoho
    let allRecords = [];
    let pageIndex = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        this.logger.debug(`Buscando página ${pageIndex} de clientes...`);

        const response = await axios.get(
          `${this.baseUrl}/crm/v2/Accounts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              per_page: pageSize,
              page: pageIndex,
              fields: [
                'id',
                'Account_Name',
                'Email',
                'Phone',
                'Website',
                'Industry',
                'Billing_Street',
                'Billing_City',
                'Custom_Tier', // Campo customizado: bronze, silver, gold, platinum
                'Active_Status', // Campo customizado: true/false
                'Annual_Revenue', // Campo customizado: receita
                'Customer_Satisfaction', // Campo customizado: 1-10
              ].join(','),
            },
          }
        );

        if (response.data.data) {
          allRecords = allRecords.concat(response.data.data);
          this.logger.debug(`Adicionados ${response.data.data.length} registos`);
        }

        // Verificar se há mais páginas
        hasMore = response.data.info?.more_records || false;
        pageIndex++;
      }

      this.logger.info(`✅ Total de clientes buscados: ${allRecords.length}`);
      return allRecords;
    } catch (error) {
      throw new Error(`Erro ao buscar clientes do Zoho: ${error.message}`);
    }
  }

  /**
   * Normalizar dados do Zoho para formato interno
   */
  normalizeData(rawData) {
    return rawData.map((record) => ({
      externalId: record.id,
      name: record.Account_Name,
      email: record.Email || null,
      phone: record.Phone || null,
      tier: (record.Custom_Tier || 'bronze').toLowerCase(),
      status: record.Active_Status ? 'active' : 'inactive',
      monthlyValue: parseFloat(record.Annual_Revenue || 0) / 12,
      satisfactionScore: parseInt(record.Customer_Satisfaction || 0),
      metadata: {
        website: record.Website,
        industry: record.Industry,
        address: {
          street: record.Billing_Street,
          city: record.Billing_City,
        },
      },
    }));
  }

  /**
   * Mapear para formato de banco de dados
   */
  async mapToDatabase(normalizedData) {
    return normalizedData.map((item) => ({
      external_id: item.externalId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      tier: item.tier,
      status: item.status,
      monthly_value: item.monthlyValue,
      satisfaction_score: item.satisfactionScore,
      metadata: item.metadata,
    }));
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
            .from('clients')
            .upsert(record, { onConflict: 'external_id' });

          if (error) {
            errors.push({
              externalId: record.external_id,
              error: error.message,
            });
            this.logger.warn(
              `⚠️  Erro ao salvar cliente ${record.external_id}: ${error.message}`
            );
          } else {
            recordsSynced++;
          }
        } catch (err) {
          errors.push({
            externalId: record.external_id,
            error: err.message,
          });
        }
      }

      this.logger.info(
        `✅ Salvos ${recordsSynced}/${mappedData.length} clientes no banco`
      );

      return { recordsSynced, errors };
    } catch (error) {
      throw new Error(`Erro ao salvar clientes no banco: ${error.message}`);
    }
  }
}

export default ZohoCRMAdapter;
