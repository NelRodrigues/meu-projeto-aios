/**
 * @fileoverview ClickUp Adapter for syncing tasks and assignments
 *
 * Integra com ClickUp API v2 para buscar tarefas (Tasks) da lista configurada
 * Suporta Bearer Token Authentication e sincronização em tempo real
 */

import DataSourceAdapter from './base-adapter.js';

/**
 * Adaptador para ClickUp
 *
 * Funcionalidades:
 * - Autenticação Bearer Token
 * - Buscar tarefas (Tasks) de uma lista
 * - Normalizar dados de ClickUp para formato interno
 * - Sincronizar tarefas e atribuições (assignees)
 * - Suporte para custom fields (cliente, valor, etc.)
 */
export class ClickUpAdapter extends DataSourceAdapter {
  constructor(config = {}) {
    super(config);

    // Validar configuração necessária
    this.apiToken = config.apiToken || process.env.CLICKUP_API_TOKEN;
    this.teamId = config.teamId || process.env.CLICKUP_TEAM_ID;
    this.spaceId = config.spaceId || process.env.CLICKUP_SPACE_ID;
    this.listId = config.listId || process.env.CLICKUP_LIST_ID;

    this.baseUrl = 'https://api.clickup.com/api/v2';
  }

  /**
   * Testar conexão com ClickUp API
   */
  async testConnection() {
    try {
      if (!this.apiToken) {
        return {
          success: false,
          error: 'API Token não configurado. Configure CLICKUP_API_TOKEN.'
        };
      }

      if (!this.listId) {
        return {
          success: false,
          error: 'List ID não configurado. Configure CLICKUP_LIST_ID.'
        };
      }

      // Testar chamada simples à API
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': this.apiToken,
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
        user: data.user?.username,
        email: data.user?.email
      };
    } catch (error) {
      console.error('❌ Erro ao testar conexão ClickUp:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar tarefas da lista ClickUp
   */
  async fetchData(options = {}) {
    try {
      if (!this.apiToken) {
        return {
          success: false,
          error: 'API Token não configurado'
        };
      }

      if (!this.listId) {
        return {
          success: false,
          error: 'List ID não configurado'
        };
      }

      console.log(`📄 Buscando tarefas da lista ${this.listId} no ClickUp...`);

      // Buscar tarefas com include_closed=true para ver também tarefas concluídas
      const url = new URL(`${this.baseUrl}/list/${this.listId}/task`);
      url.searchParams.append('include_closed', 'true');
      url.searchParams.append('page', options.page || 0);
      url.searchParams.append('page_size', options.pageSize || 100);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': this.apiToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.tasks && data.tasks.length > 0) {
        console.log(`✅ ${data.tasks.length} tarefas importadas do ClickUp`);
        return {
          success: true,
          data: data.tasks,
          pagination: {
            page: options.page || 0,
            hasMore: data.tasks.length === (options.pageSize || 100)
          }
        };
      }

      return {
        success: true,
        data: [],
        pagination: { hasMore: false }
      };
    } catch (error) {
      console.error('❌ Erro ao buscar dados ClickUp:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Normalizar dados do ClickUp para formato interno
   */
  normalizeData(clickupTasks) {
    if (!clickupTasks || clickupTasks.length === 0) {
      return [];
    }

    return clickupTasks.map(task => {
      // Extrair cliente dos custom fields se existir
      let clientId = null;
      let monthlyValue = 0;

      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        const clientField = task.custom_fields.find(f => f.name === 'Cliente' || f.name === 'client');
        const valueField = task.custom_fields.find(f => f.name === 'Valor Mensal' || f.name === 'monthly_value');

        // Se existir campo de cliente, tentar encontrar o UUID
        if (clientField && clientField.value) {
          // Por enquanto guardamos como string, será mapeado depois se necessário
        }

        if (valueField && valueField.value) {
          monthlyValue = parseFloat(valueField.value) || 0;
        }
      }

      // Mapear status do ClickUp
      const status = this.mapearStatus(task.status?.status || 'to do');

      // Extrair prioridade
      const priority = task.priority ? this.mapearPrioridade(task.priority.id) : 3;

      // Extrair tags
      const tags = task.tags ? task.tags.map(t => t.name) : [];

      return {
        external_id: task.id, // ID do ClickUp
        name: task.name || 'Tarefa sem nome',
        description: task.description || null,
        client_id: clientId, // Será preenchido num sync posterior
        status,
        priority,
        due_date: task.due_date ? new Date(parseInt(task.due_date)).toISOString() : null,
        start_date: task.start_date ? new Date(parseInt(task.start_date)).toISOString() : null,
        time_estimate: task.time_estimate ? Math.floor(parseInt(task.time_estimate) / 60000) : null, // Converter para minutos
        time_tracked: task.time_tracked ? Math.floor(parseInt(task.time_tracked) / 60000) : null,
        tags,
        metadata: {
          clickup_id: task.id,
          clickup_url: task.url,
          clickup_status: task.status?.status,
          clickup_folder: task.folder?.name,
          clickup_list: task.list?.name,
          custom_fields: task.custom_fields || [],
          created_from: 'ClickUp'
        }
      };
    });
  }

  /**
   * Mapear status do ClickUp para nosso padrão interno
   */
  mapearStatus(clickupStatus) {
    const statusMap = {
      'to do': 'open',
      'in progress': 'in_progress',
      'in_progress': 'in_progress',
      'in review': 'review',
      'review': 'review',
      'in verification': 'review',
      'complete': 'completed',
      'completed': 'completed',
      'closed': 'closed'
    };

    const normalized = clickupStatus.toLowerCase();
    return statusMap[normalized] || 'open';
  }

  /**
   * Mapear prioridade do ClickUp para escala numérica
   */
  mapearPrioridade(priorityId) {
    // ClickUp priorities: 1=urgent, 2=high, 3=normal, 4=low
    return priorityId || 3;
  }

  /**
   * Sincronizar tarefas e assignees com base de dados
   * Estende o método base para sincronizar 2 tabelas
   */
  async sync(db, tableName = 'tasks') {
    try {
      console.log(`📡 Iniciando sync de ${this.getName()}...`);

      // Fetch dados da fonte
      const fetchResult = await this.fetchData();
      if (!fetchResult.success) {
        throw new Error(fetchResult.error || 'Falha ao buscar dados');
      }

      // Normalizar dados
      const normalizedData = this.normalizeData(fetchResult.data);

      if (!db) {
        console.log(`⚠️  Sem base de dados fornecida, dados não foram salvos`);
        return {
          success: true,
          recordsSynced: normalizedData.length,
          assignmentsSynced: 0,
          note: 'Dados normalizados mas não salvos (DB não configurado)'
        };
      }

      let recordsSynced = 0;
      let assignmentsSynced = 0;

      // Sincronizar tarefas
      for (const record of normalizedData) {
        try {
          const { error } = await db
            .from(tableName)
            .upsert([record], { onConflict: 'external_id' });

          if (error) throw error;
          recordsSynced++;

          // Sincronizar assignees desta tarefa
          if (fetchResult.data) {
            const originalTask = fetchResult.data.find(t => t.id === record.external_id);
            if (originalTask && originalTask.assignees && originalTask.assignees.length > 0) {
              for (const assignee of originalTask.assignees) {
                try {
                  const { error: assignError } = await db
                    .from('task_assignments')
                    .upsert({
                      task_id: record.external_id,
                      assignee_name: assignee.username || assignee.name || 'Unknown',
                      assignee_email: assignee.email,
                      assignee_id: assignee.id
                    }, { onConflict: ['task_id', 'assignee_id'] });

                  if (!assignError) {
                    assignmentsSynced++;
                  }
                } catch (error) {
                  console.warn(`⚠️  Erro ao salvar assignee:`, error.message);
                }
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️  Erro ao salvar tarefa ${record.name}:`, error.message);
        }
      }

      this.lastSyncTime = new Date();

      console.log(`✅ Sync completo: ${recordsSynced}/${normalizedData.length} tarefas, ${assignmentsSynced} assignees`);

      return {
        success: true,
        recordsSynced,
        assignmentsSynced,
        timestamp: this.lastSyncTime
      };
    } catch (error) {
      this.lastError = error;
      console.error(`❌ Erro ao sincronizar ${this.getName()}:`, error.message);
      return {
        success: false,
        error: error.message,
        recordsSynced: 0,
        assignmentsSynced: 0
      };
    }
  }

  /**
   * Verificar se está configurado
   */
  isConfigured() {
    return !!(this.apiToken && this.listId);
  }
}

export default ClickUpAdapter;
