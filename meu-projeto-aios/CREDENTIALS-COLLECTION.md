# 🔐 Recolha de Credenciais - Passo a Passo

**Tempo total: ~15 minutos**

Segue os passos abaixo e preenche os valores directamente neste ficheiro.

---

## ✅ PASSO 1: Supabase Project URL

### 1.1 Ir a Supabase

Abrir em novo tab:
```
https://app.supabase.com
```

### 1.2 Fazer Login

1. Escrever email
2. Escrever password
3. Clicar "Sign In"

### 1.3 Seleccionar Projecto

Na página inicial, seleccionar o teu projecto (ex: "Control Tower")

### 1.4 Ir a Settings > API

1. No menu esquerdo, clicar em **Settings** (engrenagem)
2. Clicar em **API** (primeira opção)
3. Procurar a secção **Project URL**

### 1.5 Copiar URL

O valor vai ser algo como:
```
https://seu-projeto.supabase.co
```

**PREENCHER ABAIXO:**
```
SUPABASE_URL =
```

---

## ✅ PASSO 2: Supabase Anon Public Key

### 2.1 Mesma Página (Settings > API)

Na mesma página onde estás (Settings > API):

### 2.2 Procurar "anon public"

Procurar a secção **Project API keys** e encontrar a chave com label **anon public**

### 2.3 Copiar Chave

A chave vai parecer:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

É uma string longa! Copiar **toda**.

**PREENCHER ABAIXO:**
```
SUPABASE_KEY =
```

---

## ✅ PASSO 3: Supabase Service Role Key

### 3.1 Mesma Página (Settings > API)

### 3.2 Procurar "service_role secret"

Na mesma secção **Project API keys**, encontrar a chave com label **service_role secret**

### 3.3 Copiar Chave

⚠️ **IMPORTANTE:** Esta é uma chave muito poderosa! Guardar com cuidado!

A chave vai parecer similar à anterior mas **será diferente**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**PREENCHER ABAIXO:**
```
SUPABASE_SERVICE_ROLE_KEY =
```

---

## ✅ PASSO 4: Anthropic Claude API Key

### 4.1 Ir a Anthropic Console

Abrir em novo tab:
```
https://console.anthropic.com
```

### 4.2 Fazer Login

1. Fazer login com a tua account
2. Se não tens, criar em https://console.anthropic.com

### 4.3 Ir a API Keys

1. Clicar em **API Keys** no menu esquerdo
2. Ou ir directamente: https://console.anthropic.com/account/keys

### 4.4 Verificar se Tens Key

Se já tens uma key criada, procurar por uma chave que começa com `sk-ant-`

Se **NÃO tens**, criar:
1. Clicar **"+ Create new key"**
2. Dar nome: `Control Tower Production`
3. Clicar **"Create Key"**

### 4.5 Copiar Key

⚠️ **CRÍTICO:** A chave só aparece UMA VEZ!
- Se perderes, terá que criar nova
- Copiar agora!

A chave vai parecer:
```
sk-ant-v0-abc123def456xyz789...
```

**PREENCHER ABAIXO:**
```
ANTHROPIC_API_KEY =
```

---

## ✅ PASSO 5: GitHub Username

### 5.1 Simples

O teu username é o que vês em:
```
https://github.com/SEU-USERNAME
```

Por exemplo: `nelson-rodrigues` ou `seu-usuario`

**PREENCHER ABAIXO:**
```
GITHUB_USERNAME =
```

---

## 📋 RESUMO - Preencher Aqui

Após completar os passos acima, o teu ficheiro de credenciais é:

```ini
# ===== SUPABASE =====
SUPABASE_URL=

SUPABASE_KEY=

SUPABASE_SERVICE_ROLE_KEY=

# ===== ANTHROPIC =====
ANTHROPIC_API_KEY=

# ===== GITHUB =====
GITHUB_USERNAME=
```

---

## ✅ VERIFICAÇÃO

Confirma que tens tudo preenchido:

- [ ] SUPABASE_URL (começa com `https://`)
- [ ] SUPABASE_KEY (começa com `eyJhbGc`)
- [ ] SUPABASE_SERVICE_ROLE_KEY (começa com `eyJhbGc`)
- [ ] ANTHROPIC_API_KEY (começa com `sk-ant-`)
- [ ] GITHUB_USERNAME (ex: nelson-rodrigues)

**Se todos estão preenchidos = PRONTO! ✅**

---

## 🚀 Próximo Passo

Depois de teres tudo preenchido:

1. **Ler:** `QUICK-DEPLOYMENT-HYBRID.md`
2. **Usar credenciais:** Nos passos de deployment

---

## 🔒 Segurança

⚠️ **IMPORTANTE:**
- Este ficheiro contém secrets sensíveis!
- **NÃO commitir para Git**
- Guardar num local seguro (gestor de passwords)
- Apagar após usar

---

## 🆘 Se Algo Correr Mal

### "Não consigo encontrar a chave Supabase"

**Verificar:**
1. Estás logado em https://app.supabase.com?
2. Seleccionaste o projecto correcto?
3. Foste a Settings > API?
4. Procura a secção "Project API keys"

### "Perdi a Anthropic API Key"

**Sem problema!**
1. Ir a https://console.anthropic.com/account/keys
2. Clicar **"+ Create new key"** novamente
3. Criar nova key
4. A antiga deixa de funcionar automaticamente

### "A chave é muito longa / não sei se é correcta"

**Normal!**
- Chaves Supabase: ~200+ caracteres
- Chaves Anthropic: ~150+ caracteres
- Se começa com o padrão certo, está OK

---

**Data:** 2026-02-15
**Status:** Ready for credentials collection
