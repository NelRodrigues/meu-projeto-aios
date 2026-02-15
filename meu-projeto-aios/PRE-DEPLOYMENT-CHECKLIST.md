# ✅ Pre-Deployment Checklist - Control Tower

Verificação completa antes de fazer deploy em produção.

---

## 📋 Fase 1: Preparação de Credenciais

### Supabase Keys

Ir a **https://app.supabase.com** > Seu Projecto > **Settings** > **API**

Encontrar e **copiar:**
- [ ] **Project URL** (ex: `https://seu-projeto.supabase.co`)
  - Guardar como `SUPABASE_URL`
- [ ] **Anon public** (começar com `eyJhbGc...`)
  - Guardar como `SUPABASE_KEY` (backend) e `VITE_SUPABASE_ANON_KEY` (frontend)
- [ ] **Service Role secret** (começar com `eyJhbGc...`)
  - Guardar como `SUPABASE_SERVICE_ROLE_KEY` (apenas backend)

### Anthropic Claude API Key

Ir a **https://console.anthropic.com**

- [ ] Clicar em **"API Keys"**
- [ ] Copiar key (começar com `sk-ant-...`)
- [ ] Guardar como `ANTHROPIC_API_KEY`

### GitHub

- [ ] Verificar que repositório `meu-projeto-aios` está em https://github.com/seu-usuario/meu-projeto-aios
- [ ] Verificar que todos os commits estão presentes (5 fases)
- [ ] Verificar que `.env.example` está no repositório (sem valores reais)

---

## 📋 Fase 2: Verificação de Código

### Backend

```bash
cd backend
npm run lint      # Deve passar sem erros
npm test          # Testes devem passar (se existirem)
npm run build     # Build deve succeed
```

- [ ] Lint passa
- [ ] Testes passam
- [ ] Build succeed

### Frontend

```bash
cd frontend
npm run lint      # Deve passar sem erros
npm run type-check # Type checking deve passar
npm run build     # Build deve succeed
```

- [ ] Lint passa
- [ ] Type-check passa
- [ ] Build succeed

### Docker (Backend)

```bash
cd backend
docker build -t control-tower-backend .
docker run -p 3000:3000 -e NODE_ENV=production control-tower-backend
```

- [ ] Docker build succeed
- [ ] Container inicia sem erros
- [ ] Health check responde: `curl http://localhost:3000/health`

---

## 📋 Fase 3: Configuração Railway

### Account Setup

- [ ] Criar conta em https://railway.app
- [ ] Verificar email
- [ ] Login bem-sucedido em https://railway.app/dashboard

### GitHub Integration

- [ ] Conectar GitHub a Railway (na primeira criação de projecto)
- [ ] Autorizar Railway a aceder ao repositório `meu-projeto-aios`
- [ ] Verificar em GitHub Settings > Applications > Railway tem acesso

### Environment Variables

Preparar lista de variáveis (valores do Passo 1):

**Backend Variables:**
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=[de Supabase]
SUPABASE_KEY=[de Supabase]
SUPABASE_SERVICE_ROLE_KEY=[de Supabase]
ANTHROPIC_API_KEY=[de Anthropic]
CORS_ORIGIN=https://seu-frontend-railway.railway.app
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=info
LOG_FORMAT=json
```

**Frontend Variables:**
```
VITE_API_URL=https://seu-backend-railway.railway.app
VITE_SUPABASE_URL=[de Supabase]
VITE_SUPABASE_ANON_KEY=[de Supabase]
VITE_APP_NAME=Control Tower Executivo
VITE_APP_VERSION=1.0.0
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_CHAT=true
VITE_FEATURE_INSIGHTS=true
```

- [ ] Todas as variáveis estão preparadas
- [ ] Valores são correctos (sem typos)

---

## 📋 Fase 4: Deployment

### Backend

- [ ] Criar novo projecto em Railway
- [ ] Conectar repositório GitHub (`meu-projeto-aios`)
- [ ] Adicionar serviço "Backend" (vai detectar Dockerfile)
- [ ] Configurar todas as Backend Variables
- [ ] Fazer deploy (clicar "Deploy")
- [ ] Esperar até ✅ "Deployment successful"
- [ ] Anotar URL do backend: `https://seu-backend-railway.railway.app`
- [ ] Testar health check: `curl https://seu-backend-railway.railway.app/health`

### Frontend

- [ ] Adicionar serviço "Frontend" ao mesmo projecto
- [ ] Configurar Frontend Variables (usar URL do backend do passo anterior)
- [ ] Fazer deploy
- [ ] Esperar até ✅ "Deployment successful"
- [ ] Anotar URL do frontend: `https://seu-frontend-railway.railway.app`
- [ ] Abrir no browser e verificar login

---

## 📋 Fase 5: Testes em Produção

### Health & Status

```bash
# Backend health
curl https://seu-backend-railway.railway.app/health

# Deve retornar:
# {
#   "status": "healthy",
#   "environment": "production",
#   "supabase": "connected"
# }
```

- [ ] Health check retorna status "healthy"
- [ ] Supabase está "connected"

### Testes de API

```bash
# Métricas
curl https://seu-backend-railway.railway.app/api/metrics/latest

# Deve retornar objeto com métricas
```

- [ ] GET /api/metrics/latest funciona
- [ ] Retorna dados (não erro)

```bash
# Insights
curl https://seu-backend-railway.railway.app/api/insights

# Deve retornar array (vazio no início é ok)
```

- [ ] GET /api/insights funciona

```bash
# Chat
curl -X POST https://seu-backend-railway.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá", "conversationId": "test"}'

# Deve retornar resposta do Claude
```

- [ ] POST /api/chat funciona
- [ ] Recebe resposta contextual

### Frontend Tests

- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] KPI cards mostram dados
- [ ] Gráficos renderizam
- [ ] Chat abre
- [ ] Insights panel aparece
- [ ] Real-time updates (abrir em 2 abas, fazer mudança, ambas actualizam)

---

## 📋 Fase 6: Monitoring Setup

### Railway Dashboard

- [ ] Ir a https://railway.app/dashboard > Seu Projecto
- [ ] Ver aba "Monitoring" com:
  - CPU usage
  - Memory usage
  - Network
  - Deployments
- [ ] Clicar em "Logs" e ver logs em tempo real

### Supabase Monitoring

- [ ] Ir a https://app.supabase.com > Seu Projecto
- [ ] Database > Logs (verificar queries)
- [ ] Settings > Usage (verificar resources)
- [ ] Real-time > Activity (verificar conexões)

- [ ] Monitorings estão a aparecer dados normalmente

---

## 📋 Fase 7: Segurança & Performance

### Rate Limiting Test

```bash
# Enviar 150 requests rapidamente
for i in {1..150}; do
  curl https://seu-backend-railway.railway.app/health
done

# Depois de 100 em 15 min, deve receber 429 (Too Many Requests)
```

- [ ] Rate limiting está activo
- [ ] Retorna 429 após limite

### CORS Test

```bash
# Testar CORS bloqueando origem não autorizada
curl -H "Origin: http://malicious.com" \
  https://seu-backend-railway.railway.app/health

# Deve retornar 403 ou sem header CORS
```

- [ ] CORS está restringido
- [ ] Apenas domínios autorizados conseguem aceder

### SSL/HTTPS

- [ ] Abrir URL do frontend no browser
- [ ] Verificar 🔒 (SSL certificate válido)
- [ ] Nenhum warning de segurança

- [ ] HTTPS está activo
- [ ] SSL certificate é válido

---

## 📋 Fase 8: Database Backup

### Supabase Backup

- [ ] Ir a Supabase Dashboard > Settings > Backups
- [ ] Verificar que "Automatic backups" está activado
- [ ] (Opcional) Clicar "Request Backup Immediately" para fazer backup manual

- [ ] Backups automáticos estão activados

### Data Retention

- [ ] Verificar retention policy (90 dias para metrics_snapshots)
- [ ] Verificar que cron job de limpeza está configurado (se implementado)

---

## 📋 Fase 9: Documentation & Handover

- [ ] README.md está actualizado
- [ ] DEPLOYMENT.md está completo
- [ ] RAILWAY-GITHUB-DEPLOY.md está disponível
- [ ] FASE-5-PRODUCAO.md está disponível
- [ ] Credentials estão guardadas em local seguro (gestão de passwords)
- [ ] Runbook de troubleshooting está documentado

---

## 🎯 Final Checklist

### Tudo Pronto para Produção?

- [ ] Backend deploys e responde a requests
- [ ] Frontend deploys e carrega
- [ ] Health check funciona
- [ ] Metrics API retorna dados
- [ ] Chat responde com contexto
- [ ] Insights aparecem
- [ ] Real-time updates funcionam
- [ ] Rate limiting está activo
- [ ] CORS está restringido
- [ ] SSL/HTTPS está activo
- [ ] Backups automáticos
- [ ] Monitoring está configurado
- [ ] Documentação está completa
- [ ] Equipa está informada

---

## 📝 Notas Importantes

1. **Secrets em .env** - NUNCA commitir valores reais
2. **Railway auto-deploys** - Todo push para `main` faz deploy automático
3. **Health checks** - São críticos para Railway detectar quando app está pronto
4. **Supabase RLS** - Protege dados em production
5. **Rate limiting** - Protege contra abuse
6. **Logs devem ser monitorizadas** - Regularmente, procurar erros

---

## 🚨 Se Algo Correr Mal

1. **Ir a Railway Dashboard > Logs**
   - Ver mensagem de erro
   - Procurar "SUPABASE_URL not set" ou similar

2. **Verificar Environment Variables**
   - Railway Dashboard > Settings > Variables
   - Confirmar que estão todas presentes e com valores correctos

3. **Testar Localmente**
   - `npm run dev` e verificar que funciona em localhost
   - Se funciona localmente mas não em Railway, é problema de env vars

4. **Supabase Connection**
   - Testar em terminal:
     ```bash
     curl -H "Authorization: Bearer $SUPABASE_KEY" \
       "$SUPABASE_URL/rest/v1/clients?select=count"
     ```
   - Se falha, regenerar keys em Supabase Dashboard

5. **CORS Errors**
   - Abrir Developer Tools (F12) > Console
   - Procurar mensagens de CORS
   - Actualizar `CORS_ORIGIN` no backend se necessário

---

**Versão:** 1.0
**Data:** 2026-02-15
**Status:** Production Ready

✅ Quando todo este checklist estiver completo, o Control Tower está operacional! 🚀
