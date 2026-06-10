# ADR-005 — Tools do Agente + Funil de Qualificação 2-portas

**Estado:** Aceite · **Data:** 2026-06-09 · **Autor:** Aria (Architect)
**Cobre:** FR2, FR4, FR5, FR6, FR7 · **Epic:** 2

## Contexto

O `porcelana-agent` (fork de `isilda-agent`) reusa o motor conversacional (debounce, queue, rate-limit, locks, followups) mas precisa de **novas tools** (as de bolo não servem) e de uma **lógica de funil de 2 portas** (consulta com fundadora vs. directo para técnicas). A regra de ouro: **nunca abrir com preços** (qualificar primeiro).

## Decisão

Definir o conjunto de tools no formato Anthropic (como `AGENT_TOOLS` da ISILDA), persistidas em `ai_agent_tools` (com `action_type`/`action_config`). O funil de 2-portas é uma **propriedade do agendamento** (`agendamentos.porta`) decidida por uma tool de qualificação, não um sub-sistema separado.

## Tools (formato Anthropic)

| Tool | Quando | Acção |
|---|---|---|
| `qualificar_lead` | após perceber a necessidade da cliente | classifica a intenção/serviço + decide `porta` (fundadora/técnica) por regras configuráveis |
| `consultar_disponibilidade` | cliente menciona data/quer marcar | RPC ADR-003 → slots livres (técnica×sala) |
| `propor_avaliacao` | 1ª vez / serviço requer avaliação prévia | sugere Consulta de Avaliação (porta de entrada) |
| `agendar_tratamento` | cliente confirma slot | cria `agendamentos` (estado `agendado`), debita sessão se em pacote |
| `reagendar` | cliente pede mudança | actualiza slot, revalida conflito |
| `consultar_pacote` | cliente pergunta sobre planos/recorrência | lê `pacotes` + saldo (`v_saldo_sessoes`) |
| `encaminhar_humano` | objecção persistente / fora de âmbito | marca conversa `transferred`, notifica equipa |

## Funil de 2-portas

```
Lead → qualificar_lead
  ├─ requer plano de tratamento / 1ª vez / caso complexo → porta = 'fundadora'
  │     → propor_avaliacao (Consulta de Avaliação com a Yolenia)
  └─ serviço directo conhecido (ex.: depilação recorrente) → porta = 'tecnica'
        → consultar_disponibilidade → agendar_tratamento
```

Os critérios exactos (que serviços vão por que porta) são **configuráveis** em `action_config` da tool `qualificar_lead` — e dependem do workshop com a cliente (risco do PRD). O schema suporta ambos sem alteração; só muda a config.

## System prompt

Reescrito a partir do `FAQ_Agente_WhatsApp` (11 secções) + `Guia_Objecoes` (preço/tempo/confiança). Estrutura herda do seed da Soraya (ISILDA), mas com:
- Persona **feminina**, tom **formal e caloroso** ("a senhora {Nome}"); suporta "o senhor" (FR1).
- **Regra de ouro:** nunca abrir com preços; qualificar → propor avaliação → só dar valor se insistir.
- Gestão de objecções: validar → compreender → reposicionar → próximo passo leve.
- Nunca se identifica como robô/IA.

Os templates prontos (boas-vindas, horários, confirmações, lembretes) entram em `templates_whatsapp` (reuso).

## Vision (`process-vision`)

Reuso da Edge Function; prompt adaptado: foto da pele/zona → **indicar procedimento provável** (não preço). Resultado alimenta `qualificar_lead`.

## Incorporação do CRM Salus (v1.2)

Ver `docs/architecture/analise-crm-salus-aproveitamento.md`. Dois padrões reforçam este ADR:

- **Escalação determinística (P1 / FR26):** antes de `porcelana-agent` gerar resposta, um step determinístico (`shouldEscalate`) avalia `escalation_keywords`, pedido explícito de humano e sentimento. Se escala → `encaminhar_humano` sem passar pelo LLM. Config em `ai_config`/`action_config`. Mais fiável que confiar no prompt.
- **Inteligência estruturada (P4 / FR22b):** a classificação por mensagem usa `generateObject`+Zod (sentiment, score 0-100, arquétipo-estética, BANT, resumo) numa **única chamada**. Substitui `isilda-lead-intelligence` ad-hoc. Arquétipos adaptados: ex. `noiva`, `gravida`, `pos_parto`, `cuidado_rotina`, `primeira_vez`.

## Consequências

- ✅ Reuso total do motor; só muda config + prompt + tools.
- ✅ Funil 2-portas é dado, não código novo — flexível por configuração.
- ✅ Alinhado com FAQ/Objecções já redigidos (zero invenção).
- ⚠️ Critérios de roteamento dependem do workshop com a cliente (pré-requisito Epic 2).
- ⚠️ `agendar_tratamento` que consome pacote precisa do schema do ADR-002 — se Epic 5 vier depois, a tool nasce sem o ramo de pacote e ganha-o em F4.
