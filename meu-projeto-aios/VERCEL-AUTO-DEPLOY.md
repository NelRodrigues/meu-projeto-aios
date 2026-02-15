# 🤖 Deploy Automático com GitHub Actions

O projecto está configurado para fazer **deploy automático** cada vez que fazes push para `main`.

## 🔑 O Que Preciso

Para activar o auto-deploy, preciso de **3 segredos GitHub**:

1. **VERCEL_TOKEN** - Token de autenticação Vercel
2. **VERCEL_ORG_ID** - ID da tua organização Vercel
3. **VERCEL_PROJECT_ID** - ID do teu projecto Vercel

## 📝 Passo 1: Obter Vercel Token

### 1.1 Ir a Vercel Settings
1. Abre: https://vercel.com/account/tokens
2. Clica: **Create Token**
3. Nome: `GitHub Auto-Deploy`
4. Copia o token (vai aparecer apenas uma vez!)

### 1.2 Obter IDs Vercel
Depois de criar o projecto no Vercel (os 3 cliques iniciais), obtém:

**VERCEL_ORG_ID:**
- Abre o teu projecto no Vercel
- URL será: `https://vercel.com/nelson-rodrigues-projects-14137f57/meu-projeto-aios`
- O ID é: `nelson-rodrigues-projects-14137f57`

**VERCEL_PROJECT_ID:**
- No dashboard do projecto, procura "Project ID"
- Ou extrai da URL: `https://vercel.com/nelson-rodrigues-projects-14137f57/meu-projeto-aios/settings`
- O Project ID está em Settings → General

## 🔐 Passo 2: Adicionar Segredos ao GitHub

1. Abre: https://github.com/NelRodrigues/meu-projeto-aios/settings/secrets/actions
2. Clica: **New repository secret**
3. Adiciona 3 segredos:

```
Name: VERCEL_TOKEN
Value: [Token que copiaste em 1.1]

Name: VERCEL_ORG_ID
Value: nelson-rodrigues-projects-14137f57

Name: VERCEL_PROJECT_ID
Value: [Obtém em 1.2]
```

## ✅ Passo 3: Fazer Deploy Automático

Depois de adicionar os segredos:

```bash
git push origin main
```

O GitHub Actions vai:
1. ✅ Fazer pull do código
2. ✅ Instalar Vercel CLI
3. ✅ Fazer build
4. ✅ Deploy para Vercel (automático!)

### Monitorizar Deploy

1. Abre: https://github.com/NelRodrigues/meu-projeto-aios/actions
2. Vê o workflow em execução
3. Clica no workflow para ver detalhes
4. Se tudo OK, projecto fica online automaticamente

## 🚀 Fluxo Completo

```
git push origin main
        ↓
GitHub Actions triggered
        ↓
Build & Test
        ↓
Deploy to Vercel (automático!)
        ↓
URL: https://meu-projeto-aios.vercel.app
```

## 📊 Status do Deployment

No GitHub:
- 🟢 Verde = Deploy bem-sucedido
- 🟠 Amarelo = Deploy em progresso
- 🔴 Vermelho = Erro no deploy

## 🆘 Troubleshooting

**"Error: No credentials found"**
- Verifica se VERCEL_TOKEN está correcto
- Testa o token manualmente

**"Project not found"**
- Verifica VERCEL_ORG_ID e VERCEL_PROJECT_ID
- Assegura que projectos existem no Vercel

**"Build failed"**
- Verifica logs no GitHub Actions
- Testa build localmente: `npm run build:all`

## 🔄 Próximas Vezes

Depois de configurar uma vez, cada push faz deploy automaticamente! 🎉

```bash
git commit -m "feat: add new feature"
git push origin main
# → Deploy automático para Vercel
```

---

**Resultado Final:** Deploy completamente automático com cada git push! ✨
