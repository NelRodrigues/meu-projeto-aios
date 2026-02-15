# 🚀 Deploy no Vercel - Control Tower

Guia simplificado para deploy no Vercel. **Muito mais fácil que Railway!**

---

## ✨ Por Que Vercel é Melhor

| Critério | Vercel | Railway |
|----------|--------|---------|
| **Setup** | 2 cliques | 10 passos |
| **Deploy** | Automático | Manual |
| **Tempo Setup** | 5 min | 30 min |
| **GitHub Integration** | Nativa | Configurável |
| **Free Tier** | Excelente | Bom |
| **Performance** | ⚡ Fast | Razoável |

---

## 🎯 Estratégia: Hybrid Deployment

```
Frontend (React + Vite)  →  VERCEL  (muito mais fácil!)
Backend (Fastify API)    →  RAILWAY (mantemos, é simples)
Database                 →  SUPABASE (mesmo)
```

**Vantagens:**
- ✅ Frontend deploy em 3 cliques
- ✅ Backend mantém configuração que já temos
- ✅ Tudo integrado com GitHub
- ✅ Deploy automático ao fazer push

---

## 📋 Pré-requisitos

- ✅ Conta no Vercel (https://vercel.com)
- ✅ Repositório GitHub com código
- ✅ Variáveis de ambiente para frontend
- ✅ Backend em produção (Railway ou outra)

---

## 🚀 Passo 1: Conectar GitHub ao Vercel

### 1.1 Ir a Vercel

```
https://vercel.com/nelson-rodrigues-projects-14137f57
```

### 1.2 Autorizar GitHub

1. Clicar em **"New Project"**
2. Clicar em **"Import Git Repository"**
3. Buscar: `meu-projeto-aios`
4. Autorizar Vercel a aceder GitHub

---

## 🎨 Passo 2: Configurar Frontend

### 2.1 Seleccionar Projecto

1. Vercel vai mostrar lista de repositórios
2. Seleccionar: **meu-projeto-aios**
3. Clicar **"Import"**

### 2.2 Framework Detection

Vercel vai perguntar:
- **Framework Preset:** Seleccionar **Vite**
- **Build and Output Settings:** (Vercel preenche automaticamente)

```
Build Command:     npm run build
Output Directory:  dist
Install Command:   npm install
```

### 2.3 Environment Variables

Clicar **"Environment Variables"** e adicionar:

```
VITE_API_URL=https://seu-backend-production.railway.app
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... [sua-chave-anon]
VITE_APP_NAME=Control Tower Executivo
VITE_APP_VERSION=1.0.0
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_CHAT=true
VITE_FEATURE_INSIGHTS=true
```

**IMPORTANTE:** Usar o `VITE_API_URL` do backend que está em Railway!

### 2.4 Deploy

1. Clicar **"Deploy"**
2. Vercel vai automaticamente:
   - Git clone
   - npm install
   - npm run build
   - Deploy para CDN
3. Esperar até ver ✅ "Deployment successful"

**URL será algo como:**
```
https://meu-projeto-aios.vercel.app
```

---

## 🔄 Passo 3: Deploy Automático (CI/CD)

### Como Funciona:

1. Fazes `git push origin main`
2. GitHub notifica Vercel
3. Vercel automaticamente:
   - Clone repo
   - Executa `npm run build`
   - Deploy novo build
4. Está ao vivo em ~1 minuto!

**Nenhuma configuração necessária!** Vercel faz tudo automaticamente.

---

## 🧪 Passo 4: Testar Deployment

### 4.1 Aceder ao Frontend

```
https://meu-projeto-aios.vercel.app
```

### 4.2 Verificar Funcionalidades

- [ ] Página carrega sem erros
- [ ] Login funciona (Supabase auth)
- [ ] Dashboard mostra dados
- [ ] KPI cards aparecem
- [ ] Gráficos renderizam
- [ ] Chat abre
- [ ] Insights panel funciona
- [ ] Real-time updates (abrir em 2 abas)

### 4.3 Verificar Console

1. Abrir Developer Tools (F12)
2. Aba **Console**
3. Procurar erros vermelhos

**Erros comuns:**
- `CORS error` → Verificar `VITE_API_URL`
- `404 not found` → Backend está offline
- `undefined` variables → Env vars não configuradas

---

## 🌐 Passo 5: Domínio Personalizado (Opcional)

Se queres usar teu próprio domínio (ex: `dashboard.marcadigital.ao`):

### 5.1 No Vercel Dashboard

1. Seleccionar projecto
2. Clicar **"Settings"**
3. Ir a **"Domains"**
4. Clicar **"Add"**
5. Digitar domínio (ex: `dashboard.marcadigital.ao`)

### 5.2 No Teu DNS Provider

1. Ir a GoDaddy, Namecheap, etc
2. Adicionar **CNAME record:**
   - **Name:** dashboard
   - **Value:** cname.vercel-dns.com (ou o valor que Vercel deu)
   - **TTL:** 3600

3. Aguardar 15-30 minutos

Vercel automaticamente emite SSL certificate!

---

## 📊 Passo 6: Analytics & Monitoring

### Vercel Dashboard

Vercel fornece:
- ✅ Deploy history
- ✅ Build times
- ✅ Edge network locations
- ✅ Performance metrics
- ✅ Error tracking

### Ver Logs

1. Vercel Dashboard > Projecto
2. Aba **"Deployments"**
3. Clicar numa deployment
4. Ver logs de build
5. Ver logs de runtime

---

## 🔒 Segurança

### ✅ Vercel Faz Automaticamente:
- ✅ HTTPS (SSL certificate)
- ✅ DDoS protection
- ✅ Secure env vars (não expostos)
- ✅ Rate limiting básico
- ✅ Web Application Firewall

### ⚠️ Lembrete:
- Não guardar secrets no código
- Usar Vercel Environment Variables
- Anon key no frontend é OK (tem RLS)
- Service role key apenas no backend

---

## 🆚 Comparação: Antes vs Depois

### ANTES (Railway)
```
1. Criar projeto Railway
2. Conectar GitHub
3. Configurar 15+ env vars
4. Configurar Dockerfile
5. Wait 10 min para build
6. Testes
= Complexo, demora 30-40 min
```

### DEPOIS (Vercel)
```
1. Clicar "New Project"
2. Seleccionar repo GitHub
3. Configurar 9 env vars (pré-preenchidas!)
4. Clicar "Deploy"
5. Wait 2 min
6. Pronto!
= Simples, demora 5-10 min
```

---

## 🎯 Arquitectura Final

```
┌──────────────────────────────────────┐
│  Frontend: React + Vite              │
│  Hosting:  VERCEL (CDN Global)       │
│  URL: meu-projeto-aios.vercel.app    │
└──────────────────────────────────────┘
              ↓ (API calls)
┌──────────────────────────────────────┐
│  Backend: Fastify API                │
│  Hosting: RAILWAY                    │
│  URL: seu-backend-railway.railway.app│
└──────────────────────────────────────┘
              ↓ (SQL queries)
┌──────────────────────────────────────┐
│  Database: Supabase PostgreSQL       │
│  URL: seu-projeto.supabase.co        │
└──────────────────────────────────────┘
```

---

## 📋 Checklist de Deployment

### Preparação
- [ ] Conta no Vercel criada
- [ ] Autorizado GitHub
- [ ] Repositório `meu-projeto-aios` visível

### Frontend Deploy
- [ ] `npm run build` funciona localmente
- [ ] Env vars preparadas (9 variáveis)
- [ ] Seleccionar projeto no Vercel
- [ ] Deploy iniciado
- [ ] ✅ Deployment successful

### Testes
- [ ] URL do Vercel abre no browser
- [ ] Dashboard carrega (não branco!)
- [ ] Login funciona
- [ ] Sem erros no console (F12)
- [ ] Real-time updates funcionam

### Produção
- [ ] Backend em Railway está online
- [ ] Health check: `curl https://seu-backend.railway.app/health`
- [ ] VITE_API_URL aponta para backend correcto
- [ ] Domínio personalizado (opcional, mas recomendado)

---

## 🚨 Troubleshooting

### "Deployment failed"

**Verificar logs:**
1. Vercel Dashboard > Deployments
2. Clicar no deployment que falhou
3. Ver mensagem de erro

**Causas comuns:**
- `npm install failed` → Problemas com package.json
- `npm run build failed` → Erro no build (TypeScript, imports, etc)
- `Output directory not found` → `dist/` não foi criado

**Solução:**
```bash
cd frontend
npm install
npm run build  # Testar localmente
npm run lint   # Verificar linting
```

### "Frontend em branco / 404"

**Verificar:**
1. F12 > Console > procurar erros vermelhos
2. Erros comuns:
   - `VITE_API_URL is not set` → Adicionar env var
   - `CORS error` → Verificar CORS no backend
   - `404 /api/metrics` → Backend offline

**Solução:**
1. Verificar Backend em Railway está online
2. Testar API: `curl https://seu-backend-railway.railway.app/health`
3. Atualizar `VITE_API_URL` se necessário
4. Clicar "Redeploy" no Vercel

### "Env vars não aparecem"

**Verificar:**
1. Vercel > Projecto > Settings > Environment Variables
2. Confirmar que estão lá
3. Clicar "Redeploy" (env vars só aparecem em novo deploy)

---

## ⚡ Performance

Vercel fornece:
- ✅ Global CDN (content delivery network)
- ✅ Edge caching automático
- ✅ Image optimization
- ✅ Code splitting (Vite já faz)
- ✅ Gzip compression

**Resultado:** ~1-2s page load time

---

## 🔄 Workflow de Desenvolvimento

### Local Development
```bash
cd frontend
npm run dev
# Abrir http://localhost:5173
```

### Push para Produção
```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

### Vercel Automaticamente:
- ✅ Detecta push
- ✅ Triggers build
- ✅ Testa build
- ✅ Deploy se sucesso
- ✅ URL atualiza

**Zero manual steps!** 🎉

---

## 📱 Responsividade

Vite + Tailwind CSS já suporta:
- ✅ Mobile (< 768px)
- ✅ Tablet (768-1024px)
- ✅ Desktop (> 1024px)
- ✅ Dark mode (se implementar)

Vercel otimiza automaticamente para todos os devices.

---

## 🎯 Próximos Passos

### Imediato:
1. [ ] Ir a https://vercel.com/nelson-rodrigues-projects-14137f57
2. [ ] Clicar "New Project"
3. [ ] Seleccionar `meu-projeto-aios`
4. [ ] Adicionar env vars (copiar do template)
5. [ ] Clicar "Deploy"

### Depois:
1. [ ] Testar no browser
2. [ ] Verificar console (F12)
3. [ ] Adicionar domínio personalizado (opcional)
4. [ ] Fazer `git push` e verificar auto-deploy

---

## 📚 Documentação Oficial

- **Vercel Docs:** https://vercel.com/docs
- **Vite Guide:** https://vitejs.dev/guide/
- **Environment Variables:** https://vercel.com/docs/concepts/projects/environment-variables

---

## ✅ Comparação Final: Vercel vs Railway

| Aspecto | Vercel | Railway |
|---------|--------|---------|
| Frontend | ⭐⭐⭐⭐⭐ Perfeito | ⭐⭐⭐ OK |
| Backend | ⭐⭐⭐ OK | ⭐⭐⭐⭐⭐ Perfeito |
| Setup Time | 5 min | 30 min |
| Cost | Grátis | Grátis |
| Performance | ⚡ Excelente | Bom |
| Auto-deploy | ✅ Sim | ✅ Sim |

**Recomendação:**
```
Frontend → Vercel (você está aqui agora!)
Backend  → Railway (manter como está)
Database → Supabase (não mudar)
```

---

**Versão:** 1.0
**Data:** 2026-02-15
**Status:** Production Ready

🚀 Pronto para deploy super rápido no Vercel!
