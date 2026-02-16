# ✅ Phase 5 - Database Migration Checklist

## 🎯 Objectivo
Executar a migration SQL para criar as tabelas de tarefas no Supabase.

## ⏱️ Tempo Estimado
- **Tempo total:** < 1 minuto
- **Dificuldade:** ⭐ Muito Fácil

---

## 📋 Checklist de Execução

### Passo 1: Preparação
- [ ] Ler este checklist até ao fim
- [ ] Ter browser aberto
- [ ] Credenciais Supabase à mão (não necessário, estão em .env)

### Passo 2: Escolher Método (Seleccione 1)

#### ⭐ OPÇÃO A: Via Interface Interactiva (RECOMENDADO)
- [ ] Abrir ficheiro `MIGRATION-SETUP.html` num browser
  - Duplo clique no ficheiro
  - OU arrastar para janela do browser aberto
- [ ] Página carrega com guia visual
- [ ] Clicar botão: **"📋 Copy SQL to Clipboard"**
  - Mensagem ✅ aparece confirmando
- [ ] Clicar botão: **"🔗 Open Supabase SQL Editor"**
  - Nova aba abre no Supabase
- [ ] Ir para Passo 3

#### OPÇÃO B: Via Supabase Dashboard Directo
- [ ] Abrir: https://app.supabase.com
- [ ] Seleccionar projecto: **nvkcsojyjwzpiqwvmzwi**
- [ ] Menu lateral: **SQL Editor** → **+ New Query**
- [ ] Ficheiro `migrations/001_add_tasks_tables.sql`
- [ ] Copiar todo o conteúdo (Ctrl+A, Ctrl+C)
- [ ] Colar no editor Supabase (Ctrl+V)
- [ ] Ir para Passo 3

#### OPÇÃO C: Via Terminal (Alternativa)
```bash
cd /Users/admin/meu-projeto-aios
node scripts/execute-migration.js
```
- [ ] Executar comando acima
- [ ] Se funcionar, ir para Passo 4 (Verificação)
- [ ] Se falhar, usar Opção A ou B

### Passo 3: Executar Migration no Supabase
- [ ] SQL está no editor Supabase (deve estar)
- [ ] Verificar que está no projecto correcto (**nvkcsojyjwzpiqwvmzwi**)
- [ ] Clicar botão azul **"RUN"** (canto superior direito)
  - OU Pressionar: **Ctrl+Enter** (Windows/Linux) / **Cmd+Enter** (Mac)
- [ ] Esperar 3-5 segundos pela execução
- [ ] Procurar mensagem: **"Query executed successfully"** ✅
  - Se erro: consultar Troubleshooting abaixo
- [ ] Ir para Passo 4

### Passo 4: Verificação de Sucesso
- [ ] Abrir dashboard Supabase
- [ ] Menu lateral: **Database** → **Tables**
- [ ] Verificar se tabelas existem:
  - [ ] ✅ `tasks` (tabela azul/normal)
  - [ ] ✅ `task_assignments` (tabela azul/normal)
- [ ] Clicar em `tasks`, verificar colunas:
  - [ ] ✅ `external_id`
  - [ ] ✅ `name`
  - [ ] ✅ `status`
  - [ ] ✅ `priority`
  - [ ] ✅ Outras colunas
- [ ] Clicar em `task_assignments`, verificar colunas:
  - [ ] ✅ `task_id`
  - [ ] ✅ `assignee_name`
  - [ ] ✅ `assignee_email`

### Passo 5: Teste Local
```bash
# Terminal 1: Iniciar servidor
cd /Users/admin/meu-projeto-aios
node simple-server.js

# Esperar até ver:
# ✅ ClickUp sync agendado (3h/3h)
# ✅ Data Sync Orchestrator inicializado
```

- [ ] Servidor iniciado sem erros
- [ ] Ver mensagens de sucesso acima

```bash
# Terminal 2 (em paralelo): Testar endpoint
curl http://localhost:3000/api/tasks | jq '.tasks | length'
```

- [ ] Comando executa
- [ ] Retorna número (esperado: 0, pois não há dados ainda)
  - [ ] ✅ Se retorna 0
  - [ ] ✅ Se retorna JSON vazio

### Passo 6: Próximas Acções
- [ ] Phase 5 completa! 🎉
- [ ] Próximas fases: Fases 6-7 (Dashboard + AI)
- [ ] Configuração ClickUp (opcional agora):
  ```bash
  # Editar .env
  CLICKUP_API_TOKEN=pk_...
  CLICKUP_LIST_ID=...
  ```

---

## ❓ Troubleshooting

### SQL Não Executa / Erro 404
**Causa:** Endpoint RPC não disponível no Supabase (normal)
**Solução:**
- [ ] Usar Opção A ou B (manual) em vez de terminal
- [ ] Não é um problema, é esperado

### "Table already exists" Error
**Causa:** Tabelas já foram criadas anteriormente
**Solução:**
- [ ] Erro é normal (CREATE TABLE IF NOT EXISTS)
- [ ] Tabelas já estão prontas
- [ ] Ir para Passo 5 (teste local)

### Tabelas Não Aparecem no Dashboard
**Causa:** Página não foi refrescada
**Solução:**
- [ ] Pressionar F5 para refrescar
- [ ] Verificar novamente
- [ ] Se persiste, conferir erro de SQL no Supabase

### Servidor Não Inicia
**Causa:** Porta 3000 em uso ou outro erro
**Solução:**
```bash
# Verificar se porta 3000 está livre
lsof -i :3000

# Se tem processo, matar:
kill -9 <PID>

# Tentar novamente
node simple-server.js
```

### Erro: "Cannot find module"
**Causa:** Node modules não instalados
**Solução:**
```bash
npm install
node simple-server.js
```

---

## 📚 Ficheiros Relacionados

| Ficheiro | Propósito |
|----------|-----------|
| `MIGRATION-SETUP.html` | 🎯 Guia visual interactivo |
| `PHASE-5-SETUP-SUMMARY.md` | 📝 Sumário rápido |
| `migrations/001_add_tasks_tables.sql` | 🗄️ Schema SQL |
| `CLICKUP-SETUP.md` | 📖 Guia completo |
| `IMPLEMENTATION-PROGRESS.md` | 📊 Status de fases |

---

## ✅ Final Checklist

- [ ] SQL migration executada com sucesso
- [ ] Tabelas criadas no Supabase (verificado)
- [ ] Índices criados (não visíveis, mas presentes)
- [ ] Função `get_task_stats()` criada
- [ ] RLS policies configuradas
- [ ] Servidor local testado (curl funcionou)
- [ ] Endpoint `/api/tasks` responde com JSON válido
- [ ] **Phase 5 COMPLETA** ✅

---

## 🎉 Quando Tudo Está Pronto

**Mensagem de Sucesso:**
```
🎉 Phase 5 Database Migration COMPLETA!

Next Steps:
1. Configurar credenciais ClickUp (opcional)
2. Iniciar sync automático (3h/3h)
3. Implementar Phase 6 (Dashboard)
4. Implementar Phase 7 (AI Integration)
```

---

## ⏱️ Timeline Esperada

| Acção | Duração |
|-------|---------|
| Abrir browser e ficheiro | 30s |
| Cópia de SQL | 10s |
| Abrir Supabase | 10s |
| Executar query | 5s |
| Verificar no dashboard | 20s |
| Teste local | 20s |
| **TOTAL** | **~ 95 segundos** |

---

## 🚀 Status Após Conclusão

```
✅ Backend         100%  (Fases 1-4 + 5)
✅ Database        100%  (Migration completa)
⏳ Dashboard       0%    (Próxima fase)
⏳ AI Integration  0%    (Próxima fase)

Total: 2 de 7 fases completas (29%)
```

---

## 📞 Dúvidas?

1. Consultar: **PHASE-5-SETUP-SUMMARY.md**
2. Consultar: **CLICKUP-SETUP.md** → Troubleshooting
3. Verificar: **MIGRATION-SETUP.html** (guia visual)
4. Tente novamente: Às vezes demora mais alguns segundos

---

**Boa sorte! 🍀 Isto leva menos de 1 minuto!**

Data: 2026-02-16
Status: ✅ Pronto para Execução
