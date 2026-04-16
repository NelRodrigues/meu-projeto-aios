# Guia de Desenvolvimento - Claude Code

## 🌍 Linguagem

**Este projecto usa português de Angola (pt-AO).** Todas as comunicações, documentação e exemplos devem estar em português angolano.

---

## 📋 Visão Geral do Projecto

Este projecto foi configurado para trabalhar com Claude Code. Este ficheiro fornece contexto e diretrizes para o assistente de IA.

**Data de Criação:** 2026-02-06
**Estado:** Iniciante - Configuração Básica Completa

---

## 🎯 Objectivos do Projecto

- Aprender e dominar Claude Code
- Implementar boas práticas de desenvolvimento
- Manter código limpo e bem documentado
- Seguir padrões consistentes

---

## 📁 Estrutura de Ficheiros

```
projecto/
├── CLAUDE.md                 # Este ficheiro (contexto do projecto)
├── README.md                 # Documentação principal
├── .gitignore               # Ficheiros ignorados pelo Git
├── .claude/
│   └── settings.json        # Configurações do Claude Code
├── src/                     # Código-fonte da aplicação
├── tests/                   # Testes unitários e integração
├── docs/                    # Documentação adicional
└── .git/                    # Repositório Git
```

---

## 💻 Padrões de Codificação

### Linguagem & Estilo
- **Linguagem Principal:** JavaScript/TypeScript
- **Formatter:** Prettier (configuração padrão)
- **Linter:** ESLint
- **Editor:** VS Code (recomendado)

### Convenções de Nomenclatura
- **Variáveis/Funções:** camelCase (`minhaFuncao`, `nomeUtilizador`)
- **Classes/Interfaces:** PascalCase (`MinhaClasse`, `MinhaInterface`)
- **Constantes:** SCREAMING_SNAKE_CASE (`MAX_TENTATIVAS`, `API_BASE_URL`)
- **Ficheiros:** kebab-case (`meu-componente.js`)
- **Pastas:** lowercase (`src/componentes/`)

### Padrões de Código
```javascript
// ✅ BOM - Nomes descritivos e claros
function calcularTotalUtilizador(itens) {
  return itens.reduce((soma, item) => soma + item.preco, 0);
}

// ❌ RUIM - Nomes obscuros
function calc(i) {
  return i.reduce((s, t) => s + t.p, 0);
}
```

---

## 🧪 Abordagem de Testes

- **Framework:** Vitest (projectos AIOX) / Jest (legacy)
- **Cobertura:** Não deve diminuir (SHOULD) — objectivo 80% para novas funcionalidades
- **Execução:** `npm test` antes de cada confirmação
- **Tipos de Teste:**
  - Unitários (funções isoladas)
  - Integração (componentes interagindo)
  - E2E (fluxos completos)

---

## 📝 Confirmações & Git

### Convenção de Confirmações
```
feat: adicionar nova funcionalidade
fix: corrigir um erro
docs: actualizar documentação
style: mudanças de formatação (sem lógica)
refactor: reorganizar código existente
test: adicionar/actualizar testes
chore: tarefas de manutenção
```

**Exemplo:** `feat: implementar autenticação JWT`

### Boas Práticas
- Confirmações atómicas (uma ideia = uma confirmação)
- Mensagens descritivas em inglês (obrigatório para conventional commits)
- Testar antes de fazer confirmação
- Push apenas via `@devops` — nunca directamente para `main`

---

## 🤖 Usando Claude Code

### Comandos Úteis
```bash
claude              # Iniciar sessão interactiva
/clear              # Limpar histórico (usar frequentemente!)
/help               # Ver comandos disponíveis
/config             # Configurar Claude Code
```

### Dicas Importantes
1. **Use Plan Mode** quando não tem certeza (`/plan`)
2. **Forneça contexto** - explique o seu pensamento
3. **Limpe o histórico** - use `/clear` para novas tarefas
4. **Verifique antes** - sempre teste antes de fazer confirmação
5. **Leia erros** - Claude é melhor com mensagens de erro claras

### Iniciando uma Tarefa
```
"Quero adicionar autenticação ao meu projecto. Vou usar JWT."
```
Claude vai:
1. Explorar a estrutura
2. Entender o contexto
3. Propor um plano
4. Implementar a solução

---

## 🔧 Tecnologias & Ferramentas

- **Node.js:** v18+
- **Gestor de Pacotes:** npm / yarn / pnpm
- **Git:** v2.30+
- **VS Code:** recomendado (com extensões úteis)

---

## 📌 Lista de Verificação para Começar

- [ ] Clonar/criar repositório
- [ ] `npm install` (ou yarn/pnpm install)
- [ ] Criar ficheiro `.env` (se necessário)
- [ ] Executar testes: `npm test`
- [ ] Verificar linting: `npm run lint`
- [ ] Criar o seu primeiro ramo
- [ ] Fazer primeira confirmação

---

## 🚫 O Que Evitar

- ❌ Confirmações grandes sem divisão
- ❌ Enviar directamente para `main` (apenas `@devops` faz push)
- ❌ Ignorar testes antes de confirmação
- ❌ Mensagens de confirmação vagas
- ❌ Código sem documentação clara
- ❌ Deixar `console.log` em produção

---

## 📚 Recursos Úteis

- [Claude Code Docs](https://code.claude.com/docs)
- [JavaScript Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [Git Workflow](https://git-scm.com/book/en/v2)

---

## WhatsApp Bot / Queue Debugging

**REGRA OBRIGATÓRIA:** Antes de qualquer fix num agente WhatsApp, usa `/diagnose-whatsapp-bot` ou segue esta ordem de diagnóstico:

1. **Rate limit / quota diária** — verificar `ai_sales_agents.settings` + contagem de `ai_agent_logs` das últimas 24h
2. **Fila de mensagens** — o processador lê de `mensagens_whatsapp` (direction=incoming), NÃO de `ai_agent_message_queue` directamente
3. **Estado das conversas** — verificar se foram pausadas (limite atingido, opt-out, pausa manual)
4. **Logs de erro** — verificar `ai_agent_logs` e `ai_agent_message_queue.error_message`
5. **Créditos Anthropic** — verificar POR ÚLTIMO, e só se 1-4 estiverem limpos. Pedir screenshot ao utilizador antes de concluir créditos esgotados

**Nunca** assumir créditos esgotados sem evidência. O erro mais comum é limite diário de mensagens.

---

## Caminhos do Projecto

- Projecto activo: `/Users/admin/PROJECTOS/ISILDA` (CRM Delicias da Isi)
- Workspace principal: `/Users/admin/PROJECTOS/`
- **NÃO** assumir `/Users/admin/MD` — confirmar com `pwd` se ambíguo

---

## Contexto de Negócio

- **Marca Digital** é a marca-mãe/agência
- **PROFUTURO**, **AGORA** e **DESPERTA** são sub-negócios/projectos sob a Marca Digital
- **ISILDA** = CRM para a Delicias da Isi (confeitaria artesanal em Luanda)
- O fundador é **Nelson Rodrigues** (NelRodrigues no GitHub/HuggingFace)

---

**Última Actualização:** 2026-04-16
**Versão:** 3.0 (Português de Angola)
