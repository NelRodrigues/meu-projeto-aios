# 🚀 Deploy no Railway via GitHub Integration

Guia passo-a-passo para fazer deploy automático do Control Tower no Railway usando integração nativa com GitHub (sem CLI ou tokens).

---

## ✅ Pré-requisitos

- ✅ GitHub account com repositório `meu-projeto-aios`
- ✅ Railway account (https://railway.app)
- ✅ Supabase project já criado e configurado
- ✅ Anthropic API key (sk-ant-...)

---

## 📋 Passo 1: Criar Projecto no Railway

### 1.1 Aceder ao Dashboard Railway

1. Ir a https://railway.app/dashboard
2. Clicar em **"+ New Project"**
3. Seleccionar **"Deploy from GitHub repo"**

### 1.2 Conectar GitHub

1. Clicar em **"Configure GitHub App"**
2. Seleccionar a account GitHub (seu-usuario)
3. Escolher repositório: **meu-projeto-aios**
4. Autorizar Railway a aceder ao repositório

Railway agora tem acesso ao teu repositório GitHub.

---

## 🔧 Passo 2: Configurar Backend

### 2.1 Criar Serviço Backend

1. No Railway Dashboard > Seu Projecto
2. Clicar **"+ New"** → **"Service from GitHub repo"**
3. Seleccionar repositório: **meu-projeto-aios**
4. Railway vai detectar o `Dockerfile` em `/backend` automaticamente

### 2.2 Configurar Variáveis de Ambiente

No Railway Dashboard, ir a **"Settings"** do serviço backend:

Clicar em **"Variables"** e adicionar:

```
# Server Configuration
NODE_ENV=production
PORT=3000

# Supabase (copiar do Supabase Dashboard > Settings > API)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJhbGc...[sua-chave-anon]
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...[sua-chave-service-role]

# Anthropic Claude API (copiar de https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-[seu-api-key]

# CORS Configuration
CORS_ORIGIN=https://seu-dominio.railway.app,https://seu-dominio-customizado.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Adapters Configuration (opcional - se usar Zoho CRM, etc)
ZOHO_CRM_ENABLED=false
GOOGLE_SHEETS_ENABLED=false
ACCOUNTING_SYSTEM_ENABLED=false

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### 2.3 Deploy Backend

1. Voltar ao dashboard do serviço
2. Clicar na aba **"Deployments"**
3. Railway vai fazer deploy automático (você vai ver um "Build in progress")
4. Esperar até ver ✅ "Deployment successful"

Quando estiver pronto, Railway vai gerar um URL como:
```
https://seu-backend-railway.railway.app
```

**Guardar este URL** - vai precisar para o frontend!

---

## 🎨 Passo 3: Configurar Frontend

### 3.1 Criar Serviço Frontend

No mesmo projecto Railway:

1. Clicar **"+ New"** → **"Service from GitHub repo"**
2. Seleccionar **meu-projeto-aios** novamente
3. Railway vai perguntar qual serviço deploy (vai detectar múltiplos Dockerfiles)
4. Seleccionar **frontend** (pode ser necessário configurar manualmente)

### 3.2 Configurar Variáveis de Ambiente

No Railway Dashboard, ir a **"Settings"** do serviço frontend:

Clicar em **"Variables"** e adicionar:

```
# API Configuration
VITE_API_URL=https://seu-backend-railway.railway.app

# Supabase (MESMAS chaves do backend)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...[sua-chave-anon]

# App Configuration
VITE_APP_NAME=Control Tower Executivo
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_CHAT=true
VITE_FEATURE_INSIGHTS=true
```

**IMPORTANTE:** O `VITE_API_URL` deve apontar para o URL do backend Railway que guardámos!

### 3.3 Deploy Frontend

1. Voltar ao dashboard do serviço frontend
2. Railway vai fazer deploy automático
3. Esperar até ver ✅ "Deployment successful"

Railway vai gerar um URL como:
```
https://seu-frontend-railway.railway.app
```

---

## 🌐 Passo 4: Configurar Domínio Personalizado (Opcional)

Se quiser usar teu próprio domínio (ex: `control-tower.marcadigital.ao`):

### 4.1 No Railway Dashboard

1. Ir ao serviço (backend ou frontend)
2. Clicar em **"Settings"**
3. Na secção **"Networking"** → Clicar **"+ Add custom domain"**
4. Digitar seu domínio (ex: `api.marcadigital.ao` para backend, `dashboard.marcadigital.ao` para frontend)
5. Railway vai gerar um valor **CNAME**

### 4.2 No Teu Provedor de DNS

1. Ir a GoDaddy, Namecheap, ou teu provedor de DNS
2. Adicionar novo **CNAME record**:
   - **Name:** api (ou dashboard)
   - **Value:** [valor copiado do Railway]
   - **TTL:** 3600

3. Aguardar 15-30 minutos para propagação DNS
4. Railway automaticamente emite um SSL certificate

### 4.3 Actualizar CORS no Backend

Se adicionaste domínio personalizado, volta ao backend e actualiza:

```
CORS_ORIGIN=https://dashboard.marcadigital.ao,https://seu-dominio-railway.railway.app
```

---

## 🧪 Passo 5: Testar Deployment

### 5.1 Health Check Backend

```bash
# Via Railway domain
curl https://seu-backend-railway.railway.app/health

# Expected response:
# {
#   "status": "healthy",
#   "environment": "production",
#   "supabase": "connected"
# }
```

### 5.2 Aceder Frontend

1. Abrir no browser: `https://seu-frontend-railway.railway.app`
2. Fazer login com credenciais Supabase
3. Verificar que KPI cards carregam
4. Testar gráficos, chat, insights

### 5.3 Testar Endpoints API

```bash
# Métricas
curl https://seu-backend-railway.railway.app/api/metrics/latest

# Insights
curl https://seu-backend-railway.railway.app/api/insights

# Chat (POST)
curl -X POST https://seu-backend-railway.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá", "conversationId": "test-123"}'
```

---

## 🔄 Passo 6: Deploy Automático (CI/CD)

Agora que está configurado, **todo push para `main` vai fazer deploy automático!**

### Como Funciona:

1. Fazes push para GitHub: `git push origin main`
2. Railway detecta mudanças
3. GitHub Actions workflows executam (lint, test, build)
4. Dockerfile é built
5. Novo deployment é feito automaticamente
6. App é atualizado em produção

### Monitorizar Deployments:

1. Ir a Railway Dashboard > Seu Projecto
2. Clicar em **"Deployments"** (cada serviço)
3. Você vai ver histórico de deployments
4. Clicar em um deployment para ver logs

---

## 📊 Passo 7: Monitoring & Observability

### Railway Dashboard

Railway Dashboard fornece:
- ✅ CPU usage
- ✅ Memory usage
- ✅ Network in/out
- ✅ Request count
- ✅ Error rate
- ✅ Response times
- ✅ Logs em tempo real

### Ver Logs em Tempo Real

No Railway Dashboard > Serviço > **"Logs"**:
- Logs de startup
- Erros em tempo real
- Requests
- Cron jobs

### Supabase Monitoring

No Supabase Dashboard:
- Database > Logs > Query Performance
- Settings > Usage (connections, CPU, memory)
- Real-time > Activity

---

## 🚨 Troubleshooting

### Backend não inicia

**Sintomas:** Deploy failed, logs mostram erro

**Solução:**
1. Ir a Railway > Backend > Logs
2. Procurar erro (ex: "SUPABASE_URL not set")
3. Verificar que todas as env vars estão configuradas
4. Se faltam, adicionar em Railway > Settings > Variables
5. Clicar "Redeploy" para tentar novamente

### Frontend em branco

**Sintomas:** Página carrega mas sem conteúdo, console mostra CORS error

**Solução:**
1. Abrir Developer Tools (F12)
2. Ver aba "Console" para erros
3. Erros comuns:
   - `VITE_API_URL` aponta para `localhost:3000` → Deve apontar para URL Railway
   - CORS bloqueando → Verificar `CORS_ORIGIN` no backend

4. Actualizar env vars e fazer redeploy

### Supabase connection failed

**Sintomas:** Backend logs mostram "Supabase connection error"

**Solução:**
1. Verificar `SUPABASE_URL` e `SUPABASE_KEY` estão correctos
2. Copiar novamente do Supabase Dashboard > Settings > API
3. Testar conexão:
   ```bash
   curl -H "Authorization: Bearer $SUPABASE_KEY" \
     "https://seu-projeto.supabase.co/rest/v1/clients?select=count"
   ```
4. Se falha, regenerar keys em Supabase Dashboard

### Real-time não actualiza

**Sintomas:** Dashboard não mostra mudanças em tempo real

**Solução:**
1. Ir a Supabase Dashboard > Settings > Realtime
2. Verificar que está habilitado para as tabelas certas:
   - metrics_snapshots ✅
   - ai_insights ✅
   - clients ✅
   - projects ✅

3. Se não está, executar em Supabase SQL Editor:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE metrics_snapshots;
   ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;
   ALTER PUBLICATION supabase_realtime ADD TABLE clients;
   ALTER PUBLICATION supabase_realtime ADD TABLE projects;
   ```

---

## 📈 Performance Targets

| Métrica | Alvo | Verificar |
|---------|------|---------|
| API Response | <200ms | Railway Metrics |
| Build Time | <5min | GitHub Actions |
| Page Load | <2s | Lighthouse |
| Uptime | 99.9% | Railway/Supabase |
| Error Rate | <0.1% | Sentry (opcional) |

---

## 🎯 Próximos Passos (Fase 6+)

Depois de estável em produção:

- [ ] Adicionar Sentry para error tracking
- [ ] Configurar email alerts para erros críticos
- [ ] Setup Redis para caching avançado
- [ ] Adicionar CDN para assets estáticos
- [ ] Implementar API versioning (/v1/, /v2/)
- [ ] Advanced analytics & reporting

---

## 📞 Suporte

- **Railway Docs:** https://railway.app/docs
- **Supabase Docs:** https://supabase.com/docs
- **Fastify Deploy:** https://www.fastify.io/docs/latest/Deployment/
- **Vite Production:** https://vitejs.dev/guide/build.html

---

**Versão:** 1.0
**Data:** 2026-02-15
**Status:** Production Ready

Boa sorte com o deploy! 🚀
