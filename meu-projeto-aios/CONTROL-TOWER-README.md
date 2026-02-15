# Control Tower Executivo - Marca Digital

Dashboard centralizado em tempo real para o CEO monitorizar KPIs críticos da agência de IA em Angola.

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- Conta Supabase Cloud
- (Opcional) Conta Anthropic para Claude API

### 1. Setup Supabase

1. Criar projecto em https://supabase.com
2. Obter `SUPABASE_URL` e `SUPABASE_KEY` (anon public)
3. Obter `SUPABASE_SERVICE_ROLE_KEY` (para backend)
4. Executar SQL schema:
   ```bash
   # No editor SQL do Supabase, executar:
   cat backend/schema.sql
   ```

### 2. Configurar Backend

```bash
cd backend
cp .env.example .env

# Editar .env com credenciais do Supabase
nano .env

# Instalar dependências
npm install

# Iniciar servidor (porta 3000)
npm run dev
```

**Variáveis de Ambiente Obrigatórias:**
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
PORT=3000
```

### 3. Configurar Frontend

```bash
cd frontend
cp .env.example .env

# Editar .env com credenciais
nano .env

# Instalar dependências
npm install

# Iniciar servidor (porta 5173)
npm run dev
```

**Variáveis de Ambiente:**
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_KEY=sua-chave-anon
VITE_API_URL=http://localhost:3000
```

### 4. Testar Aplicação

1. Abrir http://localhost:5173
2. Credenciais Supabase: usar email/password registado no Supabase Auth
3. Dashboard carrega com KPIs em tempo real

## 📁 Estrutura do Projecto

```
control-tower/
├── backend/
│   ├── server.js           # API Fastify
│   ├── schema.sql          # Schema Supabase
│   ├── .env.example        # Variáveis exemplo
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Página de autenticação
│   │   │   └── Dashboard.jsx   # Dashboard principal
│   │   ├── components/
│   │   │   ├── KPICard.jsx     # Card de métrica
│   │   │   └── InsightsPanel.jsx # Painel de insights
│   │   ├── store/
│   │   │   ├── authStore.js    # Estado de autenticação
│   │   │   └── metricsStore.js # Estado de métricas
│   │   └── styles/             # CSS por componente
│   ├── .env.example
│   └── package.json
└── CONTROL-TOWER-README.md
```

## 🔗 Endpoints da API

### Métricas
- `GET /api/metrics/latest` - Última snapshot de métricas
- `GET /api/metrics/history?days=30` - Histórico (dias)

### Insights
- `GET /api/insights` - Listar insights não descartados
- `POST /api/insights/{id}/dismiss` - Marcar como lido
- `POST /api/insights/generate` - Gerar insights manualmente

### Chat
- `POST /api/chat` - Enviar mensagem ao chatbot IA

### Sincronização
- `POST /api/sync/{source}` - Trigger manual de sync
  - Fontes: `zoho-crm`, `google-sheets`, `accounting`

### Health
- `GET /health` - Status do servidor

## 🗄️ Tabelas Supabase

| Tabela | Descrição |
|--------|-----------|
| `clients` | Clientes com status e tier |
| `projects` | Projetos com progresso |
| `revenues` | Receitas recebidas/pendentes |
| `metrics_snapshots` | Agregados diários (timestamp) |
| `ai_insights` | Insights gerados pela IA |
| `ai_conversations` | Histórico de chat |
| `data_sync_logs` | Logs de sincronização |

## ⚙️ Cron Jobs (Backend)

| Horário | Tarefa |
|---------|--------|
| 23:59 (diário) | Agregar métricas do dia |
| 08:00 (diário) | Gerar insights de IA |
| 4h/4h | Sync Zoho CRM |

## 🔐 Segurança

### RLS Policies (Row Level Security)
- ✅ Authenticated users: SELECT em todas as tabelas
- ✅ Service role: INSERT/UPDATE/DELETE em todas as tabelas

### Autenticação
- Email/Password via Supabase Auth
- JWT tokens (automático)

## 📊 KPIs Monitorizados

1. **Clientes Activos** - COUNT(clients WHERE status='active')
2. **Projetos em Andamento** - COUNT(projects WHERE status='in_progress')
3. **Receita Mensal** - SUM(revenues WHERE invoice_date >= mes_atual)
4. **Receita Anual** - SUM(revenues WHERE invoice_date >= ano_atual)
5. **Satisfação Média** - AVG(clients.satisfaction_score)

## 🛠️ Troubleshooting

### Backend não conecta ao Supabase
```bash
# Verificar credenciais em .env
# Testar conexão:
curl http://localhost:3000/health
```

### Frontend não carrega dashboard
```bash
# Verificar VITE_API_URL em .env
# Abrir console (F12) para ver erros
# Confirmar que backend está rodando
```

### Realtime não actualiza
```bash
# No Supabase, verificar se Realtime está ativado
# Checar RLS policies nas tabelas
# Recarregar página (Ctrl+Shift+R)
```

## 📝 Próximos Passos

- [ ] Fase 2: Implementar adaptadores de dados (Zoho CRM, Google Sheets)
- [ ] Fase 3: Gráficos e visualizações (Recharts)
- [ ] Fase 4: Chatbot de IA com Claude API
- [ ] Fase 5: Deploy em produção (Railway)

## 📞 Suporte

Para dúvidas sobre o projecto, consulte:
- `.aios-core/infrastructure/` - Padrões AIOS
- `.aios-core/quality/metrics-collector.js` - Inspiração MetricsAggregator
- `.aios-core/product/templates/` - Templates visuais

---

**Data:** 2026-02-15
**Versão:** 1.0 (Fase 1 - Fundação)
**Linguagem:** Português de Angola
