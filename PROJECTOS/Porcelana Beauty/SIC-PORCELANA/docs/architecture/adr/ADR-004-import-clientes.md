# ADR-004 — Estratégia de Import dos ~398 Clientes

**Estado:** Aceite · **Data:** 2026-06-09 · **Autor:** Aria (Architect)
**Cobre:** FR23 · **Epic:** 1 · **Risco:** 🔴 Bloqueador #1

## Contexto

A base de ~398 clientes está **fragmentada entre 2 softwares** (gestão + faturação). Antes de qualquer import, a cliente tem de **consolidar e validar** (acção do cliente — kick-off #3). É o bloqueador de maior risco do projecto.

## Decisão

Import em **3 etapas com staging e idempotência**, via CSV → tabela de staging → upsert para `clientes`. A ISILDA já tem `papaparse` no frontend e o padrão de import.

## Processo

```
1. EXTRAÇÃO (cliente)
   - Exportar CSV de cada software (gestão + faturação)
   - Marca Digital fornece template de colunas-alvo

2. STAGING + DEDUP (sistema)
   - Importar para tabela `_import_clientes_staging` (todas as colunas como TEXT)
   - Dedup por telefone normalizado (E.164 Angola: +244...)
   - Relatório de conflitos (mesmo telefone, nomes diferentes) para revisão humana

3. UPSERT → clientes (sistema)
   - INSERT ... ON CONFLICT (telefone) DO UPDATE
   - Mapear: nome, telefone, email, etiquetas (origem do software), notas
   - origem='indicacao'/'outro'; criar consentimento implícito pendente de confirmação
```

### Mapeamento de campos (alvo `clientes` da ISILDA)

| Campo alvo | Origem provável | Tratamento |
|---|---|---|
| `nome` | ambos | obrigatório; trim |
| `telefone` | ambos | **normalizar E.164**, chave de dedup |
| `email` | faturação | opcional |
| `total_gasto`, `ticket_medio`, `total_pedidos` | faturação | se disponível; senão 0 |
| `ultima_compra` | faturação | se disponível |
| `estagio` | derivar | `activo` se compra recente, senão `inactivo` |
| `etiquetas` | derivar | tag de origem (`importado_gestao`, `importado_faturacao`) |

## Idempotência

`telefone` é UNIQUE em `clientes` (constraint existente). O upsert é **re-executável** — correr o import duas vezes não duplica. Permite import incremental à medida que a cliente valida lotes.

## Consequências

- ✅ Re-executável, auditável (staging fica como registo).
- ✅ Dedup por telefone resolve o risco de duplicados entre os 2 softwares.
- ⚠️ **Bloqueado até a cliente entregar os CSVs consolidados.** Mitigar: Marca Digital envia o template de colunas já na Fase 0 e pode importar por lotes.
- ⚠️ Qualidade dos dados de origem é desconhecida — o relatório de conflitos da etapa 2 é essencial antes do upsert.
- ⚠️ Consentimento RGPD: clientes importados precisam de confirmar consentimento no 1º contacto (reuso de `consentimentos`).

## Incorporação do CRM Salus (v1.2) — Opt-out (P5 / FR28)

Os ~398 importados **não autorizaram explicitamente** contacto automatizado. Adopta-se o padrão de **opt-out** do CRM Salus (`lib/ai/optout.ts`): se a cliente responde a palavra exacta de saída (configurável, ex. "SAIR"), o sistema:
- desliga o agente para essa cliente (`is_ai_assigned=false`),
- suspende follow-ups/campanhas (`followup_paused=true`),
- regista `opted_out_at` (auditoria + exclusão de envios futuros),
- envia 1 confirmação curta.

Match **estrito** (só a palavra exacta, ignorando maiúsculas/pontuação) para não desligar por engano — "quero sair daqui" não conta, fica para a IA tratar. Campos novos em `clientes` ou tabela `optout` dedicada (decisão de implementação @data-engineer). Reforça a conformidade ao arrancar campanhas sobre a base importada.
