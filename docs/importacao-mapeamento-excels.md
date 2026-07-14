# Mapeamento de Importação — Excels da Global Minds

**Story 2.5 · SIC Global Minds** — documento de mapeamento coluna→campo para a importação da carteira histórica.

> ✅ **DADOS REAIS RECEBIDOS** (pasta `Dados dos Clintes/`). A importação da carteira foi **executada** a partir de `PRIORITY - Acompanhamento_processos_Global Minds.xlsx`: **44 estudantes** importados (44 leads `origem=importacao` + 44 fichas + 42 candidaturas), todos com tag `importacao_rever` porque **o ficheiro de acompanhamento não contém telefones/emails** (a coluna "Contacto" traz só o rótulo "Telefone"). A Ana completa os contactos na UI (filtro por tag). Regra da casa respeitada: **sem invenção** — o que faltava ficou em `notas` ou NULL.
>
> **Nota sobre os outros ficheiros da pasta:** `All GEA Universities.xlsx` (~2000 universidades em 20 países) é um **catálogo de parceiros**, não dados de leads → serve para enriquecer a story 2.2 (não importado aqui). `Ficha de Estudante.doc` é um **template em branco** (confirma os campos da ficha, já implementados). Os 23 PDFs de preços/FAQs alimentam o agente (E3).

---

## Regras transversais (aplicam-se aos 3 ficheiros)

- **Telefone:** normalizado com `normalizeAngolaPhone` (`src/lib/normalize-phone.ts`) → formato `244XXXXXXXXX`.
- **Origem:** todos os leads importados ficam com `lead_origem = 'importacao'`.
- **Deduplicação:** chave = telefone normalizado; *fallback* = email (minúsculas). 1 lead final por contacto; dados dos vários ficheiros fundidos na ficha.
- **Flag de revisão:** registos sem telefone/email válido OU com conflito de fusão recebem a tag `'importacao_rever'` em `leads.tags` (filtrável na UI). **Nunca descartados.**
- **Relatório:** ao fim da importação, 1 linha em `notificacoes` com o sumário JSON (total lido por ficheiro, importados, duplicados unificados, marcados para revisão).
- **Idempotência:** upsert por telefone → correr 2× não duplica.

---

## Ficheiro 1 — Ficha de Estudante

| Coluna Excel (esperada) | Campo CRM | Tabela | Notas |
|---|---|---|---|
| _(a preencher)_ Nome | `leads.nome` / `fichas_estudante.nome_completo` | leads + fichas_estudante | |
| _(a preencher)_ Telefone | `leads.telefone` | leads | normalizar |
| _(a preencher)_ Email | `leads.email` | leads | fallback de dedup |
| _(a preencher)_ Data nascimento | `fichas_estudante.data_nascimento` | fichas_estudante | |
| _(a preencher)_ Encarregado | `fichas_estudante.encarregado_nome/contacto/relacao` | fichas_estudante | |
| _(a preencher)_ Destino pretendido | `fichas_estudante.destino_pretendido` | fichas_estudante | campo livre |
| _(a preencher)_ Nível/percurso | `fichas_estudante.percurso_academico` / `nivel_linguistico` | fichas_estudante | |
| _(sem correspondência)_ | `fichas_estudante.notas` | fichas_estudante | resto do conteúdo |

## Ficheiro 2 — Planilha de acompanhamento (REAL — 44 processos, 17 colunas)

Ficheiro `PRIORITY - Acompanhamento_processos_Global Minds.xlsx`, folha "Acompanhamento". Mapeamento efectivamente usado na importação:

| Coluna Excel (real) | Campo CRM | Tabela | Notas |
|---|---|---|---|
| `Nome / Aluno` (com encarregado embutido) | `nome` + `fichas.nome_completo` | leads + fichas_estudante | |
| `Contacto(s) Responsável` | (só rótulo "Telefone") → para `notas` | — | **sem número real → tag `importacao_rever`** |
| `Destino / Instituição` | `destino` + `fichas.destino_pretendido` | leads + fichas | |
| `Programa / Curso` | → `notas` | — | ligação ao catálogo fica p/ revisão |
| **`Estado do Processo`** | `candidaturas.fase` | candidaturas | via mapa estado→fase (abaixo) |
| `Estado Pagamento`, `Documentos Pendentes`, `Observações / Notas` | agregados em `leads.notas` | leads | preservados "como estão" |
| _(derivado do estado)_ | `fichas.processo_em_curso` | fichas_estudante | `true` nas fases activas |

## Ficheiro 3 — Planilha GEA (Global Education Alliance)

| Coluna Excel (esperada) | Campo CRM | Tabela | Notas |
|---|---|---|---|
| _(a preencher)_ | `parceiros` = "Global Education Alliance" (já semeado) | — | associar candidaturas a este parceiro |
| _(a preencher)_ | ... | ... | mapear quando o formato for conhecido |

---

## Mapa estado-Excel → `pipeline_fase` (8 fases)

Fonte de verdade: `src/lib/importacao/mapeamento.ts` (`MAPA_ESTADO_FASE`). Estados REAIS da legenda oficial da GM, normalizados (sem acentos, minúsculas). **Estado desconhecido ou vazio → fase NULL → marcado para revisão** (nunca adivinha).

| Estado real da GM | `pipeline_fase` | Processo activo? |
|---|---|---|
| Proposta a Enviar | `consulta_agendada` | não |
| Aguarda Contrato | `proposta_enviada` | não |
| Pagamento Pendente | `formalizacao_pagamento` | **sim** |
| Em Curso | `em_curso` | **sim** |
| Aguarda Documentos · Aguarda Decisão · Aguarda Decisão Família · Seguimento Necessário · Sem Resposta · Verificar Situação | `em_curso` | **sim** |
| Concluído · Cancelado | `concluido` | não |

> Os estados de acompanhamento operacional (Aguarda Documentos, Sem Resposta…) não são fases do funil — um processo activo que aguarda algo continua **em curso**; a acção pendente fica em `notas`. Resultado real da importação: 39 `em_curso`, 1 `concluido`, 1 `proposta_enviada`, 1 `consulta_agendada`, 2 sem fase (revisão).

> "Processo activo = sim" → `fichas_estudante.processo_em_curso = true` → o contacto fica **excluído da rotina de retenção de 2 anos** (story 4.4).

---

## Regras de fusão de duplicados

1. Mesmo telefone normalizado (ou email em falta de telefone) → **1 lead**.
2. Campos vazios no lead existente são **preenchidos** pelos valores do ficheiro seguinte.
3. Campos com **valores divergentes** (ex.: dois nomes diferentes) → **não decidir às cegas**: mantém o primeiro e marca `'importacao_rever'` com o motivo do conflito.
4. Candidaturas de ficheiros diferentes para o mesmo lead → múltiplas `candidaturas`; `leads.pipeline_fase` reflecte a mais avançada (trigger da story 2.3).

---

*Marca Digital · SIC Global Minds · story 2.5 — mapeamento a finalizar com os ficheiros reais.*
