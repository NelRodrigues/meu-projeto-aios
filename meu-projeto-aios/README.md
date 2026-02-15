# 🎯 Control Tower Executivo - Marca Digital

Dashboard em tempo real para CEO monitorizar KPIs críticos com IA integrada.

```
┌─────────────────────────────────────┐
│  👥 Clientes  💰 Receita  ⭐ Score  │
│  45 (+12%)    1.8M KZ (+8%)  8.5/10  │
└─────────────────────────────────────┘
         ↓
    [Gráficos Realtime]
         ↓
┌─────────────────────────────────────┐
│ 🤖 Chatbot IA | 💡 Insights         │
│ "Como vai receita?" → Contextualiza │
└─────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm ou yarn
- Supabase account (free tier ok)
- Anthropic API key

### 1. Clone & Setup

```bash
git clone https://github.com/seu-usuario/meu-projeto-aios
cd meu-projeto-aios

# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (em outra aba)
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 2. Configure .env

**Backend** (`backend/.env`)
```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
ANTHROPIC_API_KEY=sk-ant-seu-api-key
```

**Frontend** (`frontend/.env`)
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 3. Database Setup

```bash
# No Supabase Dashboard > SQL Editor
# Execute os scripts em FASE-1, FASE-2, FASE-3, FASE-4 arquivos
```

### 4. Access

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- API Health: http://localhost:3000/health

## 📚 Documentação por Fase

| Fase | Status | Ficheiro | Descrição |
|------|--------|----------|-----------|
| 1 | ✅ | FASE-1-FUNDACAO.md | API, DB schema, auth |
| 2 | ✅ | FASE-2-ADAPTADORES.md | Zoho CRM, Sheets, Accounting |
| 3 | ✅ | FASE-3-GRAFICOS.md | Recharts, real-time, analytics |
| 4 | ✅ | FASE-4-CHATBOT-IA.md | Claude API, insights, chat |
| 5 | ✅ | FASE-5-PRODUCAO.md | Deploy, CI/CD, monitoring |

## 🎯 Features

### 📊 Dashboard
- 4 KPI cards com tendências (% change)
- 3 gráficos interactivos (Recharts)
- Tabela de dados detalhada
- Export CSV + Share

### 🤖 Inteligência Artificial
- Insights automáticos (08:00 cron)
- Chatbot conversacional com contexto
- Claude API integration
- Português de Angola nativo

### 🔄 Real-time Updates
- Supabase Realtime subscriptions
- Métricas actualizadas automaticamente
- Sem refresh manual
- <500ms latência

### 🛡️ Segurança
- Autenticação Supabase
- Row-level security (RLS)
- Rate limiting
- CORS configurável
- Secrets em .env

### 📈 Adaptadores
- Zoho CRM (OAuth 2.0)
- Google Sheets API
- Accounting systems (REST)
- Sync automático (cron jobs)

## 🏗️ Arquitectura

```
Frontend (React + Vite)
    ↓
API Gateway (Fastify)
    ↓
├── Services (AI, Metrics, Adapters)
├── Cron Jobs (Automação)
├── Data Processing (Agregação)
└── Database (Supabase PostgreSQL)
```

### Fluxo de Dados

1. **Ingesta** → Adaptadores sincronizam dados de Zoho, Sheets, etc
2. **Agregação** → Métricas são calculadas (23:59 cron)
3. **IA** → Claude gera insights (08:00 cron)
4. **Realtime** → Frontend subscreve mudanças (WebSocket)
5. **Visualização** → Gráficos e cards actualizam

## 🔧 Scripts Disponíveis

### Backend

```bash
npm run dev              # Dev server
npm start               # Production
npm run build           # Build (Node.js - no-op)
npm run lint            # Lint code
npm test                # Run tests
```

### Frontend

```bash
npm run dev             # Dev server (Vite)
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Lint & fix
npm run type-check      # TypeScript check
```

## 📊 Endpoints API

### Métricas
```
GET  /api/metrics/latest        # Última métrica
GET  /api/metrics/history       # Histórico (30 dias default)
POST /api/insights/generate     # Trigger insights manualmente
GET  /api/insights              # Listar insights
POST /api/insights/:id/dismiss  # Marcar como lido
```

### Chat & Conversas
```
POST /api/chat                  # Enviar mensagem
GET  /api/conversations/:id     # Histórico de conversa
```

### Admin
```
GET  /api/adapters/status       # Status dos adaptadores
POST /api/sync/:source          # Trigger sync manual
GET  /health                    # Health check
```

## 🚀 Deploy

### Railway (Recomendado)

```bash
# Backend
cd backend
railway deploy

# Frontend
cd frontend
railway deploy

# Configure domain, env vars, monitoring
```

Ver FASE-5-PRODUCAO.md para detalhes completos.

## 📱 Responsividade

| Breakpoint | Layout | Devices |
|-----------|--------|---------|
| <768px | Mobile | iPhone, Android |
| 768-1024px | Tablet | iPad, tablets |
| >1024px | Desktop | Desktop, laptop |

Chat e insights adaptam-se automaticamente.

## 🧪 Testing

```bash
# Backend tests
npm test

# Frontend lint
npm run lint

# Type checking
npm run type-check
```

## 🔐 Segurança

- ✅ Secrets em .env (nunca commitir)
- ✅ RLS policies em database
- ✅ Rate limiting (100 req/15min)
- ✅ CORS restringido
- ✅ Validação com Zod
- ✅ HTTPS em produção

## 📞 Suporte

- Issues: GitHub Issues
- Docs: Ver ficheiros FASE-*.md
- Email: support@marcadigital.ao

## 📄 Licença

ISC

## 👥 Autores

- Backend: Claude Code (Anthropic)
- Frontend: Claude Code (Anthropic)
- Architecture: Nelson Rodrigues

## 🎯 Roadmap

- [x] Fase 1: Fundação (API, DB, Auth)
- [x] Fase 2: Adaptadores (Zoho, Sheets, Accounting)
- [x] Fase 3: Visualizações (Recharts, Real-time)
- [x] Fase 4: IA (Claude, Insights, Chat)
- [x] Fase 5: Produção (Deploy, CI/CD, Monitoring)
- [ ] Fase 6: Advanced (Redis, CDN, Analytics)
- [ ] Fase 7: Mobile (React Native app)

---

**Versão:** 1.0 (Production Ready)
**Data:** 2026-02-15
**Status:** ✅ Operacional

Para mais informações, veja [DEPLOYMENT.md](./DEPLOYMENT.md)
