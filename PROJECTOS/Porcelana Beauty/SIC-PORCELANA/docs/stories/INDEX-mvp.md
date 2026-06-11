# Índice de Stories — MVP SIC Porcelana Beauty

**Go-live: Junho 2026 · 3 epics · 18 stories**

| Campo | Detalhe |
|---|---|
| **Autor** | River (SM) · 9 Jun 2026 |
| **Base** | PRD v1.2 (@po) · Arquitectura + 5 ADRs (@architect) · Migrações + RLS audit (@db-sage) |
| **Âmbito** | MVP = Epics 1+2+3 (Fundação + Agente + Agendamento) |

---

## Mapa do MVP

| Epic | Ficheiro | Stories | Estimativa | Estado |
|---|---|---|---|---|
| **E1 — Fundação** | `epic-1-fundacao.md` | 1.1–1.5 | ~3.75d | 🚧 Em curso — 1.1 ✅ · 1.2 ✅ (schema: 14 tab, RLS 14/14, anon=0) · 1.3 ✅ (RLS re-auditado em prod, 9/9 PASS) · 1.5 ✅. **Próxima: 1.4** (bloqueada CSVs cliente) |
| **E2 — Agente** | `epic-2-agente-atendimento.md` | 2.1–2.7 | ~7d | ✅ Ready |
| **E3 — Agendamento** | `epic-3-agendamento.md` | 3.1–3.6 | ~7d | ✅ Ready |

## Resolution Tracking (Validação @po, 9 Jun 2026)

| # | Sev | Achado | Estado |
|---|---|---|---|
| S01 | SHOULD-FIX | Mecânica do agente vaga → explicitado `public.ai_sales_agents` + `tenant_id`/`instance_id` | ✅ FIXED |
| S02 | SHOULD-FIX | Idioma das tools pt-AO vs schema inglês → **decidido inglês** (`qualify_lead`, `schedule_appointment`...) | ✅ FIXED |
| S03 | SHOULD-FIX | Gate ambíguo → `leads.qualification_gate` é fonte da verdade; `appointments.gate` é snapshot | ✅ FIXED |
| S04 | MEDIUM | Falta consentimento no import → AC de conformidade FR28 + `apply_optout` | ✅ FIXED |
| S05 | LOW | Realtime do schema porcelana → AC para confirmar/adicionar à publicação | ✅ FIXED |
| S06 | LOW | Falta campo Status → adicionado aos 3 epics (Ready) | ✅ FIXED |
| S07 | INFO | ACs de teste só nalgumas → adicionados a E1.4 | ✅ FIXED |

**Total: 7/7 resolvidos (100%)** · Verdicto: **GO** · Transição Draft → **Ready** aplicada.

**Total MVP:** 18 stories · ~17.75 dias de dev (sem paralelização)

---

## Identificadores de produção (SIC GERAL)

| Recurso | Valor |
|---|---|
| Projecto Supabase | `achtvzbcczmcbvjkdjry` (SIC GERAL) |
| **`tenant_id` Porcelana** | **`d7be8f8e-c48e-4ce8-95b5-2aa36a5efdf1`** |
| `db_schema` | `porcelana` · `status=active` · `plan=starter` |
| Admin owner (gestão MD) | Nelson Rodrigues · `ketson85@hotmail.com` · user_id `c3aefafe-7ce8-4da4-9d17-5fe2296a1fc0` · role `owner` |
| Migração registada | version `20260610134612` (003_register_tenant_porcelana) |

> Usar este `tenant_id` no JWT (`app_metadata.tenant_id`) e em `tenant_users` para todos os utilizadores da Porcelana.

---

## Sequência de execução (cadeia crítica)

```
E1.1 ✅ Provisionar tenant
  → E1.2 ✅ Migrações → E1.3 ✅ Re-auditar RLS (9/9 PASS prod)
        ├→ E1.4 Importar 398 (🔴 cliente · PRÓXIMA)
        └→ E1.5 ✅ WhatsApp
              → E2.1 system_prompt → E2.2 funil → E2.3 tools → E2.5 escalação
                    → (E2.4 vision ∥ E2.6 inteligência) → E2.7 testes internos
                          → E3.1 serviços → E3.2 salas → E3.3 tools agenda
                                → E3.4 lembrete → (E3.5 UI ∥ E3.6 pré-pag)
```

## Marco de go-live mínimo
**E1 completo + E2.1/2.2/2.3/2.5/2.7 + E3.1/3.2/3.3/3.4** — atende às 3 dores agudas:
- D1 (dependência da fundadora) → agente 24/7
- D2 (leads perdidas) → atendimento <60s
- D3 (no-shows) → lembrete 24h + reagendamento

P1 (vision, inteligência, UI Kanban, pré-pagamento) pode seguir logo após go-live.

---

## Bloqueadores conhecidos

| Bloqueador | Story | Owner | Mitigação |
|---|---|---|---|
| 🔴 CSVs dos 398 contactos | E1.4 | Cliente | Template enviado na Fase 0; import incremental |
| 🟠 Critérios do funil 2-portas | E2.2 | Cliente + MD | Workshop antes; mecânica primeiro, config depois |
| ✅ Aplicar migrações em prod partilhada | E1.2 | @devops | **Resolvido (10 Jun)** — schema aplicado, baseline medido, isolamento confirmado |
| 🟠 Propagar `tenant_id` para `app_metadata.tenant_id` (JWT) | Auth (E1.x) | @devops + @data-engineer | **Follow-up pós-1.2:** sem isto, utilizadores Porcelana não passam `is_member()`. Criar story de Auth antes de E1.3 validar leitura autenticada |
| 🟠 Seed de `services`/`rooms`/`packages` | E3 | MD + Cliente | **Follow-up:** tabelas estética vazias; popular antes de o agente operar agendamento |

---

## Fora do MVP (Fase 2 — Julho+)

| Epic | Conteúdo |
|---|---|
| E4 | Pagamentos completos + pré-pagamento progressivo |
| E5 | Pacotes/Cartão Black + subscrições (schema já criado) |
| E6 | Pós-venda, fidelização, segmentação |
| E7 | Dashboard avançado + análise 80/20 |
| E8 | Roleplay/treino + opt-out completo |

> Stories destes epics serão criadas quando o MVP estabilizar.

---

## Próximos passos

1. **@po** valida as stories (`*validate-story-draft`)
2. **@dev** implementa, começando por E1.1
3. **@github-devops** trata push/PR após cada story
