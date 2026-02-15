# 🚀 Deploy no Vercel - Guia Final

## ✅ Estado Actual

O projecto foi reestruturado com sucesso para Vercel serverless functions:
- ✅ Frontend em React + Vite
- ✅ Backend como serverless functions em `/api`
- ✅ Código enviado para GitHub
- ✅ Sem credenciais expostas no repositório

## 🎯 Próximos Passos (Apenas 3 Cliques)

### 1️⃣ Conectar GitHub ao Vercel

1. Abre: https://vercel.com/nelson-rodrigues-projects-14137f57
2. Clica: **Add New** → **Project**
3. Busca: `meu-projeto-aios`
4. Clica: **Import**

### 2️⃣ Configurar Variáveis de Ambiente

Na página de import do Vercel, **antes de fazer Deploy**, clica em **Environment Variables** e adiciona:

```
SUPABASE_URL=https://your-project.supabase.co

SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx

VITE_SUPABASE_ANON_KEY=eyJhbGc...

ANTHROPIC_API_KEY=sk-ant-xxxxx

CORS_ORIGIN=https://meu-projeto-aios.vercel.app

VITE_API_URL=/api

VITE_SUPABASE_URL=https://your-project.supabase.co

VITE_APP_NAME=Control Tower Executivo

VITE_APP_VERSION=1.0.0

VITE_FEATURE_ANALYTICS=true

VITE_FEATURE_CHAT=true

VITE_FEATURE_INSIGHTS=true
```

> **Nota:** Copia os valores reais do teu `.env` local ou vê `.env.example` para formatos.

### 3️⃣ Fazer Deploy

1. Clica: **Deploy**
2. Aguarda ~2-3 minutos
3. 🎉 Pronto!

## 📋 O Que Vai Acontecer

```
Deploy Process:
├─ Build
│  ├─ npm run build:all
│  ├─ cd frontend && npm install && npm run build
│  └─ Output: frontend/dist
├─ Upload
│  ├─ API handlers: /api/*.js → Vercel Functions
│  └─ Frontend: /frontend/dist → Vercel CDN
└─ Configure
   ├─ Routing rules (vercel.json)
   ├─ Environment variables
   └─ Serverless functions
```

## 🌐 URLs Finais

Depois do deploy, terás:

```
Frontend: https://meu-projeto-aios.vercel.app
API:      https://meu-projeto-aios.vercel.app/api

Endpoints:
GET  /health                    → Health check
GET  /api/metrics/latest        → Últimas métricas
GET  /api/metrics/history       → Histórico (30 dias)
GET  /api/insights              → Insights não lidos
POST /api/insights/generate     → Gerar insights
POST /api/insights/:id/dismiss  → Descartar insight
POST /api/chat                  → Chat com IA
```

## ✅ Checklist Final

- [ ] Cliquei em Vercel → Add New → Project
- [ ] Selecionei meu-projeto-aios
- [ ] Adicionei todas as 11 variáveis de ambiente
- [ ] Cliquei Deploy
- [ ] Aguardei 2-3 minutos
- [ ] Abri https://meu-projeto-aios.vercel.app
- [ ] Dashboard carregou corretamente
- [ ] Chatbot respondeu com dados reais

## 🆘 Troubleshooting

**Erro: "Failed to build"**
- Verifica se as dependências estão correctas
- Executa localmente: `cd frontend && npm install && npm run build`

**Erro: "API returns 500"**
- Verifica as variáveis de ambiente no Vercel
- Verifica se Supabase está online

**Erro: "Cannot find Supabase"**
- Verifica SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY

## 📞 Suporte

Se algo não funcionar:
1. Verifica os logs do Vercel (Deployments → Details)
2. Verifica as variáveis de ambiente
3. Verifica se o Supabase está acessível

---

**Status:** Pronto para Deploy ✅
**Hora Estimada:** 5 minutos
**Custo:** Grátis (plano Vercel Hobby)

Boa sorte! 🚀
