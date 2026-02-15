# Fase 5: Deploy em Produção - Control Tower

## 🚀 Implementação Completa

Sistema pronto para produção com optimizações, testes, segurança, CI/CD e monitoring.

### 📁 Estrutura de Produção

```
project/
├── .github/workflows/
│   ├── backend-deploy.yml          # CI/CD Backend
│   └── frontend-deploy.yml         # CI/CD Frontend
├── backend/
│   ├── Dockerfile                  # Containerização
│   ├── .dockerignore
│   ├── .env.example                # Template de env
│   ├── package.json                # Scripts build/test/lint
│   └── server.js                   # Rate limiting + CORS
├── frontend/
│   ├── .env.example                # Template de env
│   ├── vite.config.js              # Otimizações build
│   └── package.json                # Scripts build/lint
├── railway.json                    # Config Railway deploy
├── DEPLOYMENT.md                   # Guia passo-a-passo
└── README.md                       # Documentação principal
```

### 🔧 Optimizações Implementadas

#### Backend

**Performance**
- ✅ Logger desabilitado em produção (apenas errors)
- ✅ Health checks para liveness probes
- ✅ Compressão de responses
- ✅ Connection pooling Supabase

**Segurança**
- ✅ CORS restringido (variável CORS_ORIGIN)
- ✅ Rate limiting (100 req/15min por IP)
- ✅ Trust proxy para Railway
- ✅ Validação com Zod em todos os inputs
- ✅ Secrets em .env (nunca em código)

**DevOps**
- ✅ Dockerfile multi-stage (otimiza tamanho)
- ✅ Non-root user (nodejs)
- ✅ Health check configurado
- ✅ Graceful shutdown com dumb-init

#### Frontend

**Build Optimization**
- ✅ Vite build production-ready
- ✅ Code splitting automático
- ✅ Tree-shaking de dependências
- ✅ Minificação de CSS/JS
- ✅ Asset versioning (cache busting)

**Performance**
- ✅ Lazy loading de componentes
- ✅ React.memo para charts
- ✅ useCallback otimizações
- ✅ Supabase query caching

**Segurança**
- ✅ API calls com .env variables
- ✅ Sem secrets no frontend code
- ✅ HTTPS only em produção
- ✅ CSP headers (recomendado)

### 🧪 Testes

**Backend Tests**
```bash
npm test              # Executa testes
npm run lint          # Lint + fix
```

**Frontend Tests**
```bash
npm run lint          # ESLint
npm run type-check    # TypeScript check
npm run build         # Verifica build
```

### 📊 CI/CD Workflows

#### Backend Deploy
```
Push to main (backend/**)
    ↓
1. Install dependencies
2. Run linting
3. Run tests
4. Build Docker image
5. Deploy to Railway
6. Notify deployment
```

#### Frontend Deploy
```
Push to main (frontend/**)
    ↓
1. Install dependencies
2. Run linting
3. Run tests
4. Build for production
5. Deploy to Railway
6. Notify deployment
```

### 🚢 Deploy em Railway

#### 1. Setup Railway Project

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Criar projecto
railway init

# Conectar repositório GitHub
railway link
```

#### 2. Configurar Variáveis de Ambiente

```bash
# Backend variables
railway variables set NODE_ENV=production
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set SUPABASE_URL=https://...
railway variables set SUPABASE_SERVICE_ROLE_KEY=...
railway variables set CORS_ORIGIN=https://yourdomain.com

# Frontend variables
railway variables set VITE_API_URL=https://api.yourdomain.com
railway variables set VITE_SUPABASE_URL=https://...
railway variables set VITE_SUPABASE_ANON_KEY=...
```

#### 3. Deploy Backend

```bash
cd backend
railway deploy

# Verificar logs
railway logs
```

#### 4. Deploy Frontend

```bash
cd frontend

# Build
npm run build

# Deploy
railway deploy
```

#### 5. Configurar Domínio

No Railway Dashboard:
- Settings > Domains > Add Custom Domain
- Apontar DNS para Railway endpoints
- Esperar SSL certificate

### 🔒 Segurança em Produção

#### RLS Policies Audit

```sql
-- Verificar RLS está activo
SELECT tablename FROM pg_tables
WHERE pg_table_is_visible(pg_class.oid);

-- Verificar policies
SELECT * FROM pg_policies;

-- Testar bypass (deve falhar)
SELECT * FROM clients;  -- Sem autenticação
```

#### Rate Limiting

```javascript
// Automático em NODE_ENV=production
100 requisições por 15 minutos por IP

Endpoints críticos (customizável):
- POST /api/chat (3s timeout)
- POST /api/insights/generate
- POST /api/sync/:source
```

#### CORS Configuração

```bash
# Production (.env)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Development (.env)
CORS_ORIGIN=http://localhost:5173
```

### 📡 Monitoring & Observability

#### Health Checks

```bash
# Backend health
curl https://api.yourdomain.com/health

# Response esperado
{
  "status": "healthy",
  "timestamp": "2026-02-15T10:30:00Z",
  "environment": "production",
  "supabase": "connected"
}
```

#### Logging

```bash
# Railway Logs
railway logs --service backend

# Ver erros em tempo real
railway logs --follow --failed
```

#### Metrics

Railway Dashboard fornece:
- CPU usage
- Memory usage
- Network in/out
- Request count
- Error rate
- Response times

### 🔄 Database Maintenance

#### Backup Automático

Supabase > Settings > Backups
- Daily automatic backups
- Point-in-time recovery (7 dias)
- Manual backup anytime

#### Index Optimization

```sql
-- Verificar índices
SELECT * FROM pg_indexes
WHERE tablename IN ('metrics_snapshots', 'ai_insights', 'clients');

-- Criar índices adicionais se necessário
CREATE INDEX idx_ai_insights_severity
ON ai_insights(severity, created_at DESC);
```

#### Data Retention Policy

```sql
-- Limpeza automática de dados antigos (90 dias)
DELETE FROM metrics_snapshots
WHERE snapshot_date < NOW() - INTERVAL '90 days';

DELETE FROM ai_insights
WHERE created_at < NOW() - INTERVAL '30 days'
AND is_dismissed = true;
```

### 📋 Pre-Deploy Checklist

- [ ] Todas as 4 fases anteriores completadas
- [ ] .env.example preenchido com valores reais
- [ ] Secrets configurados em Railway dashboard
- [ ] CORS_ORIGIN correcto para domínio
- [ ] Supabase RLS policies auditadas
- [ ] Database backups configurados
- [ ] Health endpoints funcionando
- [ ] Rate limiting testado
- [ ] SSL certificate provisionado
- [ ] DNS apontando para Railway
- [ ] Monitoring Supabase + Railway activo
- [ ] Documentação actualizada

### 🚨 Troubleshooting

#### Backend não inicia

```bash
# Verificar logs
railway logs --service backend --follow

# Verificar se todas as env vars estão presentes
railway variables

# Testar localmente
npm install
npm start
```

#### Frontend não carrega

```bash
# Verificar build
npm run build

# Verificar env vars
echo $VITE_API_URL
echo $VITE_SUPABASE_URL

# Testar CORS erro
# Verificar que CORS_ORIGIN no backend inclui domínio
```

#### Supabase connection failed

```bash
# Verificar keys
echo $SUPABASE_URL
echo $SUPABASE_KEY

# Testar conexão
curl -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/clients?select=count"
```

#### Rate limit exceeded

```bash
# Aumentar limite em produção (se necessário)
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_MS=900000  # 15 min
```

### 📈 Performance Targets

| Métrica | Alvo | Ferramenta |
|---------|------|-----------|
| API Response | <200ms | Railway metrics |
| Build Time | <5min | GitHub Actions |
| Page Load | <2s | Lighthouse |
| Uptime | 99.9% | Railway/Supabase |
| Error Rate | <0.1% | Sentry |

### 🔗 Resources

- [Railway Docs](https://railway.app/docs)
- [Supabase Production](https://supabase.com/docs/guides/platform/going-into-prod)
- [Fastify Deployment](https://www.fastify.io/docs/latest/Deployment/)
- [Vite Production Build](https://vitejs.dev/guide/build.html)

### 📝 Notas

- Todos os dados sensíveis ficam em .env (não commitir)
- Railway auto-deploys em push para main
- Health checks são críticos para Railway
- Supabase RLS protege dados em production
- Rate limiting protege contra abuse
- Logs devem ser monitorizados regularmente

### 🎯 Próximas Fases (Futuro)

- [ ] Advanced caching (Redis)
- [ ] CDN para assets estáticos
- [ ] Email notifications para alertas críticos
- [ ] API versioning (/v1/, /v2/)
- [ ] GraphQL API alternativa
- [ ] Mobile app nativa
- [ ] Advanced analytics & reporting
- [ ] Custom integrations marketplace

---

**Versão:** 5.0 (Fase 5 - Deploy em Produção)
**Data:** 2026-02-15
**Status:** ✅ Pronta para Deploy
