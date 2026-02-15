# 🎯 Guia Visual - Recolha de Credenciais

Guia passo-a-passo com screenshots em ASCII art. Super claro!

---

## 🔑 CREDENCIAL 1: Supabase Project URL

### Passo 1: Abrir Supabase

```
Abre em novo browser tab:
https://app.supabase.com

Deves ver:
┌─────────────────────────────────────┐
│  SUPABASE Dashboard                 │
│  ┌─────────────────────────────────┐│
│  │ Your Projects                   ││
│  │ ┌────────────────────────────┐  ││
│  │ │ Control Tower (seu projeto)│  ││
│  │ │ [Clicar aqui]              │  ││
│  │ └────────────────────────────┘  ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Passo 2: Ir a Settings > API

```
No menu esquerdo, deves ver:

┌────────────────────────┐
│ Supabase Menu          │
├────────────────────────┤
│ 🏠 Home                │
│ 📊 SQL Editor          │
│ 📈 Reports             │
│ ⚙️  Settings  ← CLICAR │
│ ℹ️  About              │
└────────────────────────┘

Depois de Settings:

┌────────────────────────┐
│ Settings Menu          │
├────────────────────────┤
│ 🔑 API           ← AQUI │
│ 📋 Billing             │
│ 🔒 Authentication      │
│ 📱 Integrations        │
└────────────────────────┘
```

### Passo 3: Copiar Project URL

```
Em Settings > API, procura:

┌──────────────────────────────────────┐
│ PROJECT SETTINGS                     │
├──────────────────────────────────────┤
│                                      │
│ Project URL:                         │
│ ┌────────────────────────────────┐   │
│ │ https://seu-projeto.supabase.co   │ ← COPIAR
│ └────────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘

✅ Guardar em: MY-CREDENTIALS.txt
   SUPABASE_URL=https://seu-projeto.supabase.co
```

---

## 🔑 CREDENCIAL 2: Supabase Anon Key

### Passo 1: Mesma página (Settings > API)

```
Scroll down na mesma página até encontrar:

┌──────────────────────────────────────┐
│ PROJECT API KEYS                     │
├──────────────────────────────────────┤
│                                      │
│ anon public:                         │
│ ┌────────────────────────────────┐   │
│ │ eyJhbGciOiJIUzI1NiIsInR5...    │ ← COPIAR
│ └────────────────────────────────┘   │
│ [Copy button]                        │
│                                      │
│ service_role secret:                 │
│ ┌────────────────────────────────┐   │
│ │ (a outra chave - não copiar    │   │
│ │  agora, virá depois)           │   │
│ └────────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘

✅ Guardar em: MY-CREDENTIALS.txt
   SUPABASE_KEY=eyJhbGc...
```

---

## 🔑 CREDENCIAL 3: Supabase Service Role Key

### Passo 1: Mesma página (Settings > API)

```
Mesmo local anterior, mas:

┌──────────────────────────────────────┐
│ PROJECT API KEYS (continue scroll)   │
├──────────────────────────────────────┤
│                                      │
│ service_role secret:                 │
│ ┌────────────────────────────────┐   │
│ │ eyJhbGciOiJIUzI1NiIsInR5...    │ ← COPIAR
│ │ (DIFERENTE da chave anterior)  │   │ ← GUARDAR COM CUIDADO!
│ └────────────────────────────────┘   │
│ [Copy button]                        │
│                                      │
│ ⚠️  Muito poderosa!                  │
│    Guardar em local seguro           │
│                                      │
└──────────────────────────────────────┘

✅ Guardar em: MY-CREDENTIALS.txt
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## 🔑 CREDENCIAL 4: Anthropic API Key

### Passo 1: Ir a Anthropic Console

```
Abre em novo browser tab:
https://console.anthropic.com

Deves ver:
┌─────────────────────────────────────┐
│  ANTHROPIC CONSOLE                  │
│  ┌─────────────────────────────────┐│
│  │ Welcome to Claude              ││
│  │                                 ││
│  │ [Alguns links]                  ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Passo 2: Ir a API Keys

```
No menu esquerdo ou topo:

┌────────────────────────────────┐
│ Menu Anthropic                 │
├────────────────────────────────┤
│ 📚 Documentation               │
│ 🔑 API Keys         ← CLICAR   │
│ 💬 Support                     │
└────────────────────────────────┘

Ou clica directo:
https://console.anthropic.com/account/keys
```

### Passo 3: Ver/Criar API Key

```
Em API Keys, deves ver:

Opção A: Se JÁ TENS key:
┌────────────────────────────────┐
│ EXISTING API KEYS              │
├────────────────────────────────┤
│ • Control Tower Production     │
│   sk-ant-v0-abc123def456...    │ ← COPIAR
│   Created: 2026-02-15          │
└────────────────────────────────┘

Opção B: Se NÃO TENS key:
┌────────────────────────────────┐
│ NO API KEYS YET                │
├────────────────────────────────┤
│ [+ Create new key] ← CLICAR    │
└────────────────────────────────┘

Depois de criar:
1. Nome: "Control Tower Production"
2. Clicar: "+ Create Key"
3. COPIAR a chave que aparece:
   sk-ant-v0-abc123def456...

⚠️  APARECE APENAS UMA VEZ!
```

### Passo 4: Copiar Key

```
┌────────────────────────────────┐
│ NEW API KEY CREATED            │
├────────────────────────────────┤
│                                │
│ sk-ant-v0-abc123def456xyz789   │ ← COPIAR AGORA!
│                                │
│ [Copy button]                  │
│                                │
│ ⚠️  This key only shows once!  │
│    Copy it now and store safely│
│                                │
└────────────────────────────────┘

✅ Guardar em: MY-CREDENTIALS.txt
   ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🔑 CREDENCIAL 5: GitHub Username

### Passo 1: Simples!

```
O teu username está aqui:

https://github.com/SEU-USERNAME

Por exemplo:

Se o URL é: https://github.com/nelson-rodrigues
Então o username é: nelson-rodrigues

Se o URL é: https://github.com/seu-usuario
Então o username é: seu-usuario

✅ Guardar em: MY-CREDENTIALS.txt
   GITHUB_USERNAME=nelson-rodrigues
```

---

## ✅ VERIFICAÇÃO FINAL

```
Abre MY-CREDENTIALS.txt e verifica:

┌─────────────────────────────────────┐
│ MY-CREDENTIALS.txt                  │
├─────────────────────────────────────┤
│                                     │
│ SUPABASE_URL=https://seu-proj...   │ ✅
│ SUPABASE_KEY=eyJhbGc...            │ ✅
│ SUPABASE_SERVICE_ROLE_KEY=eyJh...  │ ✅
│ ANTHROPIC_API_KEY=sk-ant-...       │ ✅
│ GITHUB_USERNAME=nelson-rodrigues   │ ✅
│                                     │
└─────────────────────────────────────┘

SE TODOS 5 ESTÃO PREENCHIDOS: ✅ PRONTO!
```

---

## 🚀 PRÓXIMO PASSO

```
Depois de teres credenciais:

1. Fechar este ficheiro
2. Abrir: QUICK-DEPLOYMENT-HYBRID.md
3. Seguir passo-a-passo
4. Usar credenciais de MY-CREDENTIALS.txt
```

---

## 📱 Dicas Úteis

### "A chave é muito longa, tenho a certeza que é certa?"

```
Sim! Chaves normalmente são:

Supabase:   ~200-300 caracteres
Anthropic:  ~100-150 caracteres

Se começa com:
- eyJhbGc  (Supabase) ✅
- sk-ant-  (Anthropic) ✅

Então é a chave certa!
```

### "Não encontro o botão"

```
Tentas diferentes:
1. Refresh a página (F5)
2. Fazer logout e login novamente
3. Usar navegador diferente
4. Tentar em modo incógnito
```

### "Copiei mas o paste não cola nada"

```
Alguns browsers bloqueiam cópia.
Tenta:

1. Seleccionar manualmente com rato
2. Ctrl+C (ou Cmd+C no Mac)
3. Colar em MY-CREDENTIALS.txt

Se ainda não funciona:
- Usar browser diferente
- Ou copiar manualmente escrevendo
```

---

## 🔒 LEMBRETE FINAL

```
⚠️  SECURITY WARNING

┌─────────────────────────────────────┐
│ CREDENCIAIS RECOLHIDAS!             │
│                                     │
│ ✅ Guardar num local seguro         │
│    (gestor de passwords recomendado)│
│                                     │
│ ❌ NÃO commitir para Git            │
│ ❌ NÃO enviar por email             │
│ ❌ NÃO compartilhar com outros      │
│                                     │
│ 🗑️  APAGAR após usar no deployment │
│                                     │
└─────────────────────────────────────┘
```

---

**Data:** 2026-02-15
**Status:** Ready for credentials collection

Quando tiveres as 5 credenciais em MY-CREDENTIALS.txt, estás pronto para fazer deploy! 🚀
