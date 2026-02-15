# 📦 Guia de Deployment - Control Tower

Guia passo-a-passo para fazer deploy em produção.

## 📋 Pré-requisitos

1. GitHub account (repositório configurado)
2. Railway account (https://railway.app)
3. Supabase project (database já criada)
4. Anthropic API key (Claude API)
5. Domain name (opcional, usa Railway domain padrão)

## 🚀 Passo 1: Preparar o Código

### 1.1 Configurar Git

```bash
cd meu-projeto-aios

# Verificar remote
git remote -v
# origin  https://github.com/seu-usuario/meu-projeto-aios (fetch)
# origin  https://github.com/seu-usuario/meu-projeto-aios (push)

# Se não existir, adicionar
git remote add origin https://github.com/seu-usuario/meu-projeto-aios
```

### 1.2 Verificar Branch Principal

```bash
# Assegurar que estamos em main
git checkout -b main

# Commitir todas as mudanças
git add .
git commit -m "chore: production ready - all phases complete"
git push origin main
```

## 📦 Passo 2: Setup Railway

### 2.1 Criar Projecto no Railway

```bash
# Instalar Railway CLI (se não tiver)
npm install -g @railway/cli

# Login
railway login

# No seu repositório, linkar Railway
railway init

# Seguir prompts e seleccionar GitHub repo
```

### 2.2 Configurar Backend

```bash
# Entrar no projecto Railway
railway

# Adicionar variáveis de ambiente
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set SUPABASE_URL=https://seu-projeto.supabase.co
railway variables set SUPABASE_KEY=eyJhbGc...
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set CORS_ORIGIN=https://seu-dominio.com

# Deploy backend
cd backend
railway deploy
```

### 2.3 Configurar Frontend

```bash
# Voltar ao root
cd ..

# Adicionar variáveis para frontend
railway variables set VITE_API_URL=https://seu-backend-railway.railway.app
railway variables set VITE_SUPABASE_URL=https://seu-projeto.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Deploy frontend
cd frontend
railway deploy
```

## 🔗 Passo 3: Configurar Domínio (Opcional)

### 3.1 No Railway Dashboard

1. Ir a: https://railway.app/dashboard
2. Seleccionar seu projecto
3. Na aba "Domains":
   - Click em "+ Add Custom Domain"
   - Digitar seu domínio (e.g., api.marcadigital.ao)
   - Copiar o CNAME value

### 3.2 No Seu DNS Provider

1. Ir para seu DNS provider (GoDaddy, Namecheap, etc)
2. Adicionar CNAME record:
   - Name: api
   - Value: [valor copiado do Railway]
   - TTL: 3600

3. Aguardar 15-30 minutos para propagação DNS

### 3.3 Verificar SSL Certificate

```bash
# Quando DNS estiver resolvido, Railway emite cert automaticamente
# Ver status no dashboard

# Testar HTTPS
curl https://api.seu-dominio.com/health
```

## 🧪 Passo 4: Testar Deployment

### 4.1 Backend Health Check

```bash
# Via Railway domain
curl https://seu-backend-railway.railway.app/health

# Response esperado:
# {
#   "status": "healthy",
#   "environment": "production",
#   "supabase": "connected"
# }
```

### 4.2 Frontend Access

```bash
# Abrir no browser
https://seu-frontend-railway.railway.app

# Fazer login
# Verificar KPI cards carregam
# Testar gráficos, chat, insights
```

### 4.3 Testar Endpoints

```bash
# Metrics
curl https://api.seu-dominio.com/api/metrics/latest

# Insights
curl https://api.seu-dominio.com/api/insights

# Chat (POST)
curl -X POST https://api.seu-dominio.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá", "conversationId": "test-123"}'
```

## 🔄 Passo 5: Setup CI/CD

### 5.1 Conectar GitHub Actions

1. Ir a seu repositório GitHub
2. Settings > Secrets and variables > Actions
3. Adicionar secrets:

```
RAILWAY_TOKEN=seu-token-railway
VITE_API_URL=https://seu-backend-railway.railway.app
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 5.2 Obter Railway Token

```bash
# Gerar token no Railway
railway token

# Copiar o output
# Ir para GitHub Secrets e adicionar como RAILWAY_TOKEN
```

### 5.3 Testar CI/CD

```bash
# Fazer commit e push para main
git add .
git commit -m "test: trigger CI/CD"
git push origin main

# Ver GitHub Actions > Workflows
# Deve começar a build automático
```

## 📊 Passo 6: Monitoring

### 6.1 Ver Logs em Tempo Real

```bash
# Backend logs
railway logs --follow --service backend

# Frontend logs
railway logs --follow --service frontend

# Ver erros
railway logs --follow --failed
```

### 6.2 Railway Dashboard

Acesso a:
- Métricas (CPU, RAM, rede)
- Logs
- Deploy history
- Environment variables

### 6.3 Supabase Monitoring

Em https://app.supabase.com:
- Database > Logs > Query Performance
- Settings > Usage
- Real-time > Activity

## 🔒 Passo 7: Segurança

### 7.1 Verificar CORS

```bash
# Deve retornar 403 de domínios não autorizados
curl -H "Origin: http://malicious.com" \
  https://seu-backend-railway.railway.app/health
```

### 7.2 Verificar Rate Limiting

```bash
# Enviar múltiplos requests rápidos
for i in {1..150}; do
  curl https://seu-backend-railway.railway.app/health
done

# Depois de 100 em 15 min, deve receber 429
```

### 7.3 Backup Database

```bash
# No Supabase Dashboard
# Settings > Backups > Request Backup Immediately

# Ou automático (habilitado por padrão)
```

## 🐛 Troubleshooting

### Backend não inicia

```bash
# Ver logs
railway logs --follow

# Erros comuns:
# - SUPABASE_URL/KEY não configuradas
# - NODE_ENV não é 'production'
# - Port 3000 já em uso

# Fix: Adicionar env vars
railway variables set NODE_ENV=production
```

### Frontend em branco

```bash
# Ver browser console (F12)
# Erros comuns:
# - VITE_API_URL aponta para localhost
# - CORS bloqueando requisições

# Fix:
railway variables set VITE_API_URL=https://seu-backend.railway.app
```

### Realtime não actualiza

```bash
# Supabase Dashboard > Settings > Realtime
# Verificar que está habilitado

# Ou verificar logs no backend
railway logs --follow
```

### Rate limit muito restritivo

```bash
# Aumentar limites se necessário
railway variables set RATE_LIMIT_MAX_REQUESTS=200
railway variables set RATE_LIMIT_WINDOW_MS=900000
```

## 📈 Performance Tuning

### Frontend Build Size

```bash
# Analisar bundle
npm run build:analyze

# Identificar packages grandes
# Considerar lazy loading

# Resultado esperado: <200KB gzipped
```

### Database Queries

```bash
# Supabase > Logs > Slow Queries
# Optimizar índices se necessário

# Ver exemplo em FASE-5-PRODUCAO.md
```

### Cache Strategy

```bash
# Frontend:
# - useRealtimeMetrics caches 30 dias
# - Charts lazy-load sob demanda

# Backend:
# - Realtime subscriptions (eficiente)
# - CSV export cacheado (?)
```

## 🎯 Checklist Final

Antes de produção:

- [ ] Backend deploys sem erros
- [ ] Frontend deploys e carrega
- [ ] Health check funciona
- [ ] Metrics API retorna dados
- [ ] Chat responde com contexto
- [ ] Insights aparecem
- [ ] Real-time updates funcionam
- [ ] Rate limiting activo
- [ ] CORS restringido
- [ ] Logging configurado
- [ ] Backups automáticos
- [ ] Domain SSL certificado
- [ ] GitHub Actions CI/CD
- [ ] Monitoring Sentry (opcional)
- [ ] Slack/Email alerts (opcional)

## 📞 Suporte

- Railway Support: https://railway.app/support
- Supabase Docs: https://supabase.com/docs
- GitHub Docs: https://docs.github.com

---

**Pronto para produção!** 🚀

Qualquer dúvida, ver [FASE-5-PRODUCAO.md](./FASE-5-PRODUCAO.md)
