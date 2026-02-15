# 🔐 Guia de Recolha de Credenciais

Instruções passo-a-passo para juntar todas as credenciais necessárias para deploy.

---

## 📋 Checklist de Credenciais Necessárias

- [ ] Supabase Project URL
- [ ] Supabase Anon Public Key
- [ ] Supabase Service Role Key
- [ ] Anthropic Claude API Key
- [ ] GitHub Username (repositório)

**Tempo total:** ~10 minutos

---

## 🔑 Passo 1: Supabase - Project URL

### 1.1 Aceder ao Supabase Dashboard

1. Abrir: https://app.supabase.com
2. Fazer login com a tua account
3. Seleccionar o teu projecto

### 1.2 Copiar Project URL

1. Na barra lateral esquerda, clicar em **Settings** (engrenagem)
2. Clicar em **API** (primeira opção)
3. Na secção **Project URL**, copiar o valor (ex: `https://seu-projeto.supabase.co`)

**Guardar como:** `SUPABASE_URL`

```
SUPABASE_URL=https://seu-projeto.supabase.co
```

✅ **Feito**

---

## 🔑 Passo 2: Supabase - Anon Public Key

### 2.1 Mesma Página (Settings > API)

Na mesma página anterior (Settings > API):

1. Procurar a secção **Project API keys**
2. Encontrar a chave com label **anon public**
3. Copiar o valor (começa com `eyJhbGc...`)

**Guardar como:**
- Backend: `SUPABASE_KEY`
- Frontend: `VITE_SUPABASE_ANON_KEY` (mesmo valor)

```
SUPABASE_KEY=eyJhbGc...
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

✅ **Feito**

---

## 🔑 Passo 3: Supabase - Service Role Key

### 3.1 Mesma Página (Settings > API)

Na mesma página (Settings > API):

1. Procurar a chave com label **service_role secret**
2. Copiar o valor (começa com `eyJhbGc...`)

**⚠️ IMPORTANTE:** Esta chave é muito poderosa! Nunca a partilhes ou commitir para Git!

**Guardar como:** `SUPABASE_SERVICE_ROLE_KEY`

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

✅ **Feito**

---

## 🔑 Passo 4: Anthropic Claude API Key

### 4.1 Aceder ao Anthropic Console

1. Abrir: https://console.anthropic.com
2. Fazer login com a tua account

### 4.2 Gerar Nova API Key (se não tiveres)

1. Na barra lateral, clicar em **API Keys** (ou ir directamente: https://console.anthropic.com/account/keys)
2. Clicar em **+ Create new key**
3. Dar um nome (ex: "Control Tower Production")
4. Clicar **Create Key**

### 4.3 Copiar API Key

1. A página vai mostrar a chave (ex: `sk-ant-...`)
2. **Copiar imediatamente** (só aparece uma vez!)
3. Guardar em local seguro

**⚠️ IMPORTANTE:** Esta é a única vez que vês a chave! Se perderes, tens que criar uma nova.

**Guardar como:** `ANTHROPIC_API_KEY`

```
ANTHROPIC_API_KEY=sk-ant-...
```

✅ **Feito**

---

## 🔑 Passo 5: GitHub - Username & Repositório

### 5.1 Verificar Repositório GitHub

1. Abrir: https://github.com/seu-usuario/meu-projeto-aios
2. Verificar que repositório existe
3. Clicar em **Code** (botão azul)
4. Copiar URL HTTPS: `https://github.com/seu-usuario/meu-projeto-aios.git`

**Guardar como:** `GITHUB_REPO_URL`

```
GITHUB_REPO_URL=https://github.com/seu-usuario/meu-projeto-aios.git
GITHUB_USERNAME=seu-usuario
```

✅ **Feito**

---

## 📝 Passo 6: Compilar Todas as Credenciais

### Cria um ficheiro temporário com TODAS as credenciais

Cria um ficheiro de texto (ex: `CREDENTIALS.txt`) com este formato:

```
=== SUPABASE ===
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

=== ANTHROPIC ===
ANTHROPIC_API_KEY=sk-ant-...

=== GITHUB ===
GITHUB_USERNAME=seu-usuario
GITHUB_REPO_URL=https://github.com/seu-usuario/meu-projeto-aios.git

=== DOMÍNIOS (preencher depois se quiser) ===
CORS_ORIGIN=https://seu-frontend-railway.railway.app
VITE_API_URL=https://seu-backend-railway.railway.app
```

**⚠️ IMPORTANTE:** Este ficheiro contém secrets!
- Guardar num local seguro
- NÃO commitir para Git
- NÃO enviar por email
- Apagar depois de usar

---

## 🚀 Passo 7: Usar as Credenciais no Railway

### Quando estiveres a Fazer Deploy:

1. Abrir Railway Dashboard
2. Para cada variável de ambiente, copiar do ficheiro `CREDENTIALS.txt` que criaste
3. Cola no Railway Dashboard

**Backend Variables:**
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=[de CREDENTIALS.txt]
SUPABASE_KEY=[de CREDENTIALS.txt]
SUPABASE_SERVICE_ROLE_KEY=[de CREDENTIALS.txt]
ANTHROPIC_API_KEY=[de CREDENTIALS.txt]
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
VITE_SUPABASE_URL=[de CREDENTIALS.txt]
VITE_SUPABASE_ANON_KEY=[de CREDENTIALS.txt]
VITE_APP_NAME=Control Tower Executivo
VITE_APP_VERSION=1.0.0
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_CHAT=true
VITE_FEATURE_INSIGHTS=true
```

---

## ✅ Verificação Final

### Confirmar que tens tudo:

- [ ] SUPABASE_URL (começa com `https://`)
- [ ] SUPABASE_KEY (começa com `eyJhbGc`)
- [ ] SUPABASE_SERVICE_ROLE_KEY (começa com `eyJhbGc`)
- [ ] ANTHROPIC_API_KEY (começa com `sk-ant-`)
- [ ] GITHUB_REPO_URL (começa com `https://github.com/`)

Se tiver tudo, estás pronto para fazer deploy! ✅

---

## 🔒 Segurança - Boas Práticas

### ✅ FAZ ISTO:
- Guardar credenciais num local seguro (gestor de passwords)
- Usar .env.example como template (sem valores reais)
- Adicionar credenciais apenas no Railway Dashboard (não no código)
- Rotar keys periodicamente
- Usar service_role key apenas no backend

### ❌ NÃO FAÇAS ISTO:
- Commitir .env com valores reais
- Enviar credenciais por email
- Compartilhar API keys
- Deixar credenciais em ficheiros visíveis
- Usar mesma chave em múltiplos ambientes

---

## 🆘 Troubleshooting

### Não consigo encontrar as Keys no Supabase

1. Certifica-te que estás logado
2. Seleccionar o projecto correcto (dropdown no canto superior esquerdo)
3. Ir a Settings > API (não Other > API)
4. Se ainda não consegues, criar novo projecto

### Perdi a Anthropic API Key

1. Não há problema - criar uma nova
2. Ir a https://console.anthropic.com/account/keys
3. Clicar em **+ Create new key**
4. A antiga deixa de funcionar automaticamente

### Não consegui copiar a chave

Alguns browsers bloqueiam cópia. Tentar:
1. Seleccionar manualmente com rato
2. Ctrl+C (ou Cmd+C no Mac)
3. Usar browser diferente
4. Clicar no botão "Copy" se existir

---

## 📱 Cheat Sheet Rápido

| Credencial | Onde Encontrar | Começa com |
|------------|----------------|-----------|
| SUPABASE_URL | app.supabase.com > Settings > API | `https://` |
| SUPABASE_KEY | app.supabase.com > Settings > API > anon public | `eyJhbGc` |
| SUPABASE_SERVICE_ROLE_KEY | app.supabase.com > Settings > API > service_role | `eyJhbGc` |
| ANTHROPIC_API_KEY | console.anthropic.com > API Keys | `sk-ant-` |
| GITHUB_REPO | github.com/seu-usuario/meu-projeto-aios | `https://` |

---

## 🎯 Próximo Passo

Depois de teres todas as credenciais:

1. Ler: [RAILWAY-GITHUB-DEPLOY.md](./RAILWAY-GITHUB-DEPLOY.md)
2. Ir a: https://railway.app/dashboard
3. Conectar GitHub repo
4. Adicionar as credenciais
5. Deploy! 🚀

---

**Versão:** 1.0
**Data:** 2026-02-15
**Tempo Estimado:** 10 minutos

Boa sorte! 🍀
