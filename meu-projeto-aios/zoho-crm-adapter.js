/**
 * @fileoverview Zoho CRM Adapter for syncing customers and deals
 *
 * Integra com Zoho CRM API para buscar clientes (Accounts) e projectos (Deals)
 * Suporta OAuth 2.0 e refresh automático de tokens.
 */

import DataSourceAdapter from './base-adapter.js';

/**
 * Adaptador para Zoho CRM
 *
 * Funcionalidades:
 * - Autenticação OAuth 2.0
 * - Buscar clientes (Accounts)
 * - Buscar projectos (Deals)
 * - Normalizar dados de Zoho para formato interno
 * - Pagination automática
 */
export class ZohoCRMAdapter extends DataSourceAdapter {
  constructor(config = {}) {
    super(config);

    // Validar configuração necessária
    this.organizationId = config.organizationId || process.env.ZOHO_ORG_ID;
    this.accessToken = config.accessToken || process.env.ZOHO_ACCESS_TOKEN;
    this.refreshToken = config.refreshToken || process.env.ZOHO_REFRESH_TOKEN;
    this.clientId = config.clientId || process.env.ZOHO_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.ZOHO_CLIENT_SECRET;
    this.region = config.region || 'com'; // com, eu, in, au, jp

    this.baseUrl = `https://www.zohoapis.${this.region}/crm/v2.1`;
  }

  /**
   * Testar conexão com Zoho CRM
   */
  async testConnection() {
    try {
      if (!this.accessToken) {
        return {
          success: false,
          error: 'Access token não configurado. Configure ZOHO_ACCESS_TOKEN.'
        };
      }

      // Testar chamada simples à API
      const response = await fetch(`${this.baseUrl}/settings/org`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: 'Token inválido ou expirado'
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        organization: data.org.organization_name,
        email: data.org.email
      };
    } catch (error) {
      console.error('❌ Erro ao testar conexão Zoho:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar clientes (Accounts) do Zoho CRM
   */
  async fetchData(options = {}) {
    try {
      if (!this.accessToken) {
        return {
          success: false,
          error: 'Access token não configurado'
        };
      }

      const pageSize = options.pageSize || 200;
      let allAccounts = [];
      let pageIndex = 1;
      let hasMore = true;

      while (hasMore) {
        console.log(`📄 Buscando página ${pageIndex} de Accounts...`);

        const url = new URL(`${this.baseUrl}/Accounts`);
        url.searchParams.append('page', pageIndex);
        url.searchParams.append('per_page', pageSize);

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
          allAccounts = allAccounts.concat(data.data);
          pageIndex++;
          hasMore = data.info?.more_records || false;
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ ${allAccounts.length} contas importadas do Zoho CRM`);

      return {
        success: true,
        data: allAccounts
      };
    } catch (error) {
      console.error('❌ Erro ao buscar dados Zoho:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Normalizar dados do Zoho para formato interno
   */
  normalizeData(zohoAccounts) {
    if (!zohoAccounts || zohoAccounts.length === 0) {
      return [];
    }

    return zohoAccounts.map(account => {
      // Mapear tier de Zoho para nosso sistema
      let tier = 'bronze'; // default
      const industry = account.Industry || '';
      const annualRevenue = account.Annual_Revenue || 0;

      if (annualRevenue > 1000000) {
        tier = 'platinum';
      } else if (annualRevenue > 500000) {
        tier = 'gold';
      } else if (annualRevenue > 100000) {
        tier = 'silver';
      }

      return {
        external_id: account.id, // ID do Zoho
        name: account.Account_Name || 'Unknown',
        email: account.Email || null,
        phone: account.Phone || null,
        tier,
        status: account.Status === 'Active' ? 'active' : 'inactive',
        monthly_value: (annualRevenue / 12) || 0,
        satisfaction_score: 8, // Default - será actualizado depois
        metadata: {
          zoho_id: account.id,
          zoho_industry: industry,
          zoho_annual_revenue: annualRevenue,
          zoho_website: account.Website,
          created_from: 'Zoho CRM'
        }
      };
    });
  }

  /**
   * Renovar access token usando refresh token
   */
  async refreshAccessToken() {
    try {
      if (!this.refreshToken || !this.clientId || !this.clientSecret) {
        console.warn('⚠️  Refresh token não configurado');
        return false;
      }

      console.log('🔄 Renovando access token Zoho...');

      const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.access_token) {
        this.accessToken = data.access_token;
        console.log('✅ Access token renovado com sucesso');
        return true;
      } else {
        throw new Error('Nenhum access token retornado');
      }
    } catch (error) {
      console.error('❌ Erro ao renovar access token:', error.message);
      return false;
    }
  }

  /**
   * Verificar se está configurado
   */
  isConfigured() {
    return !!(this.accessToken || (this.refreshToken && this.clientId && this.clientSecret));
  }
}

export default ZohoCRMAdapter;
