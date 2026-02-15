# ⚡ Quick Deployment - Hybrid Vercel + Railway

**Tempo Total: ~20 minutos**

Estratégia simples e rápida:
- Frontend → Vercel (3 cliques, 5 min)
- Backend → Railway (simples, 10 min)
- Database → Supabase (já existe)

---

## 📋 Credenciais Necessárias

Antes de começar, recolher:

### Para Frontend (Vercel)
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=[preenchemos depois quando backend estiver pronto]
```

### Para Backend (Railway)
```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJhbGc... (anon)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (service role)
ANTHROPIC_API_KEY=sk-ant-...
```

**Onde copiar:**
- Supabase: https://app.supabase.com > Settings > API
- Anthropic: https://console.anthropic.com > API Keys

---

## 🚀 PASSO 1: Backend no Railway (10 min)

### 1.1 Criar Projecto

```
https://railway.app/dashboard → "New Project" → "Deploy from GitHub"
```

### 1.2 Conectar GitHub

1. Clicar "Configure GitHub App"
2. Autorizar acesso
3. Seleccionar repositório: `meu-projeto-aios`

### 1.3 Criar Serviço Backend

1. Clicar "New" → "GitHub Repo"
2. Railway vai detectar `/backend` Dockerfile
3. Nome: `backend`

### 1.4 Adicionar Env Vars

Railway Dashboard → Backend → Settings → Variables

**COPIAR E COLAR:**
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJhbGc... [copiar de Supabase API]
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... [copiar de Supabase API]
ANTHROPIC_API_KEY=sk-ant-... [copiar de Anthropic]
CORS_ORIGIN=https://meu-projeto-aios.vercel.app
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=info
LOG_FORMAT=json
```

### 1.5 Deploy Backend

1. Railway automático detecta e faz deploy
2. Esperar até ✅ "Deployment successful"
3. **Copiar URL do backend** (ex: `https://seu-backend-railway.railway.app`)

### 1.6 Testar Backend

```bash
curl https://seu-backend-railway.railway.app/health

# Esperado:
# {
#   "status": "healthy",
#   "environment": "production",
#   "supabase": "connected"
# }
```

✅ **Backend está online!**

---

## 🎨 PASSO 2: Frontend no Vercel (5 min)

### 2.1 Ir a Vercel

```
https://vercel.com/nelson-rodrigues-projects-14137f57
```

### 2.2 New Project

1. Clicar **"Add New..."** → **"Project"**
2. Clicar **"Import Git Repository"**
3. Buscar `meu-projeto-aios`
4. Clicar **"Import"**

### 2.3 Framework Detection

Vercel vai pedir configuração. **NÃO MUDAR, aceitar defaults:**
```
Framework: Vite
Build: npm run build
Install: npm install
```

### 2.4 Env Vars - IMPORTANTE!

Clicar "Environment Variables" e adicionar:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... [copiar de Supabase]
VITE_API_URL=https://seu-backend-railway.railway.app [URL DO PASSO 1]
VITE_APP_NAME=Control Tower Executivo
VITE_APP_VERSION=1.0.0
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_CHAT=true
VITE_FEATURE_INSIGHTS=true
```

**⚠️ CRÍTICO:** `VITE_API_URL` deve ser a URL do Railway do Passo 1!

### 2.5 Deploy

1. Clicar **"Deploy"**
2. Esperar até ✅ "Deployment successful"
3. **Copiar URL do Vercel** (ex: `https://meu-projeto-aios.vercel.app`)

---

## 🧪 PASSO 3: Testes Rápidos (5 min)

### 3.1 Abrir Frontend

```
https://meu-projeto-aios.vercel.app
```

### 3.2 Verificar Básico

- [ ] Página carrega (não branco)
- [ ] Login funciona
- [ ] Dashboard mostra dados
- [ ] F12 Console - sem erros vermelhos

### 3.3 Se Algo Falhar

**Erro: "Cannot find module" ou "Blank page"**
- Abrir F12 > Console
- Procurar erro
- Erro comum: `VITE_API_URL is undefined`
  - Volta a Vercel > Settings > Environment Variables
  - Confirma que todas estão lá
  - Clicar "Redeploy"

**Erro: "API not responding"**
- Backend está offline
- Testar: `curl https://seu-backend-railway.railway.app/health`
- Se retorna erro, ir a Railway > Logs e ver erro

---

## 🎯 Resumo - URLs Finais

Após completar, terás:

```
Frontend:  https://meu-projeto-aios.vercel.app
Backend:   https://seu-backend-railway.railway.app
Database:  https://seu-projeto.supabase.co (não público)
```

---

## 🔄 Workflow Futuro

### Fazer Mudanças Localmente

```bash
# Frontend
cd frontend
npm run dev
# Editar componentes
git add .
git commit -m "feat: mudança"
git push origin main
# Vercel auto-deploy em ~1 min ✅

# Backend
cd backend
npm run dev
# Editar API
git add .
git commit -m "feat: novo endpoint"
git push origin main
# Railway auto-deploy em ~3 min ✅
```

**Zero manual steps! Tudo automático.**

---

## ✅ Checklist Final

### Antes de Começar
- [ ] Tenho credenciais Supabase?
- [ ] Tenho API key Anthropic?
- [ ] Tenho conta no Railway?
- [ ] Tenho conta no Vercel?
- [ ] Tenho repositório GitHub?

### Passo 1 - Backend (Railway)
- [ ] Projeto criado
- [ ] Serviço backend criado
- [ ] Env vars adicionadas
- [ ] Deploy successful ✅
- [ ] Health check retorna "healthy" ✅
- [ ] Copiei URL do backend

### Passo 2 - Frontend (Vercel)
- [ ] Projeto importado
- [ ] Env vars adicionadas (incl. VITE_API_URL do backend!)
- [ ] Deploy successful ✅
- [ ] Página carrega no browser ✅
- [ ] Sem erros no console ✅

### Pronto!
- [ ] Frontend: https://meu-projeto-aios.vercel.app
- [ ] Backend: https://seu-backend-railway.railway.app
- [ ] Database: Supabase (online)

---

## 🆘 Se Algo Estiver Mal

### "Vercel deployment failed"
```
1. Ver logs: Vercel > Deployments > Failed
2. Erro comum: "Supabase vars not set"
3. Solução: Adicionar env vars em Vercel > Settings
4. Clicar "Redeploy"
```

### "Frontend branco"
```
1. F12 > Console > procurar erro
2. Erro comum: CORS, API unreachable
3. Testar backend: curl https://seu-backend.railway.app/health
4. Se falha, backend está offline
```

### "Backend não inicia"
```
1. Railway > Backend > Logs
2. Procurar SUPABASE_URL, ANTHROPIC_API_KEY errors
3. Adicionar/corrigir env vars em Railway
4. Clicar "Redeploy"
```

---

## 📊 Performance

Esperado após deploy:
- ✅ Frontend load: ~1-2s (Vercel global CDN)
- ✅ Backend response: <200ms (Railway)
- ✅ Real-time updates: <500ms (Supabase WebSocket)
- ✅ Uptime: 99%+ (ambos)

---

## 🚀 Próximos Passos Imediatos

**AGORA:**
1. Recolher credenciais (Supabase + Anthropic)
2. Ler [VERCEL-DEPLOYMENT-GUIDE.md](./VERCEL-DEPLOYMENT-GUIDE.md) (se quiser detalhes)
3. Ou seguir este checklist rápido

**DEPOIS:**
1. Deploy backend no Railway (10 min)
2. Deploy frontend no Vercel (5 min)
3. Testar (5 min)
4. Pronto!

---

## 📚 Referência

| Recurso | Link | Utilidade |
|---------|------|-----------|
| Railway Docs | https://railway.app/docs | Backend deploy |
| Vercel Docs | https://vercel.com/docs | Frontend deploy |
| Supabase | https://app.supabase.com | Database |
| Anthropic | https://console.anthropic.com | API keys |

---

**Versão:** 1.0
**Data:** 2026-02-15
**Tempo Total:** ~20 minutos

🚀 **Pronto para estar online!**
