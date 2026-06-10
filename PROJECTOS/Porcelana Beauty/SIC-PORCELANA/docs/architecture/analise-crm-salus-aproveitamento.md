# Análise — O que aproveitar do CRM-Agêntico Salus para a Porcelana Beauty

**Auditoria comparativa · Salus CRM-Agentico × ISILDA × SIC Porcelana Beauty**

| Campo | Detalhe |
|---|---|
| **Autor** | Aria (Architect) — Marca Digital |
| **Data** | 9 de Junho de 2026 |
| **Fontes** | `/Users/admin/PROJECTOS/Salus/CRM-Agentico` · `/Users/admin/PROJECTOS/ISILDA` |
| **Estado** | Recomendação para incorporar no PRD/arquitectura antes das stories |

---

## 1. Contexto

A arquitectura base do SIC Porcelana Beauty assenta na **ISILDA** (CRM confeitaria). Auditei o **CRM-Agêntico da Salus Water** (vendas de filtros de água, Flórida) para identificar padrões que a ISILDA *não tem* e que valem para a estética.

**Conclusão central:** o CRM Salus é, em vários aspectos, uma **geração arquitectural à frente** da ISILDA. Não substitui a base (a ISILDA tem o motor de queue/debounce maduro e está em produção), mas tem **6 padrões superiores** que devemos incorporar selectivamente.

### Diferença de stack (relevante)

| | ISILDA | Salus CRM |
|---|---|---|
| Motor de agente | Edge Functions Deno + queue própria | **Vercel Workflow SDK** (workflows duráveis) |
| LLM | chamadas directas Anthropic | **AI SDK (`ai` + `@ai-sdk/anthropic`) + Zod** |
| Conversa | queue + cron poll | **workflow durável com hibernação** (1 vivo/lead) |
| Classificação | tools ad-hoc | **`generateObject` + schema Zod** (estruturado) |

---

## 2. Os 6 Padrões a Aproveitar

### 🟢 P1 — Escalação determinística ANTES de responder (`lib/ai/escalation.ts`)
**O que é:** antes de o LLM gerar resposta, uma função determinística decide se escala para humano — por palavra-chave, pedido explícito ("falar com uma pessoa"), sentimento negativo, ou valor acima de threshold. Corre como step, não depende do LLM "decidir bem".

**Porquê para a Porcelana:** o Guia de Objecções já diz "se a objecção for persistente, encaminhar para humano **sem hesitar**". Hoje, no desenho ISILDA, isso depende do prompt. Com este padrão, vira **regra de negócio configurável** (`escalation_keywords`, thresholds). Mais fiável e auditável.

**Veredicto:** ✅ **ADOPTAR** — vira parte do ADR-005 (tool `encaminhar_humano` ganha um guard determinístico a montante).

---

### 🟢 P2 — Roleplay / Treino do agente (`lib/ai/roleplay.ts` + `/treinamento`)
**O que é:** um simulador onde a equipa **treina contra personas-IA** que encarnam arquétipos de cliente, levantam objecções realistas, e o sistema **avalia o desempenho** do vendedor. Penaliza promessas proibidas (ex.: "cura").

**Porquê para a Porcelana:** o kick-off exige **testes internos do agente antes de activar para clientes reais** + **formação da equipa**. O roleplay resolve exactamente isto: a Yolenia e as técnicas treinam contra "a senhora cética do preço", "a grávida ansiosa", "a cliente que viu mais barato noutro sítio" — e o sistema mede se cumpriram o tom formal e a regra de não-abrir-preço. **Mapeia 1:1 com o Guia de Objecções.**

**Veredicto:** ✅ **ADOPTAR (alto valor)** — candidato a story própria. Diferenciador real para a garantia de adopção.

---

### 🟢 P3 — Agendamento com Google Calendar + extracção de data/hora (`book-visit.ts`, `extract-datetime.ts`, `google/calendar.ts`)
**O que é:** o agente extrai data/hora da mensagem em linguagem natural, verifica FreeBusy no Google Calendar do executor, cria o evento e grava com idempotência (não duplica se já há evento futuro). Degradação graciosa quando ambíguo.

**Porquê para a Porcelana:** complementa o ADR-003. A ISILDA tem capacidade-simples; o ADR-003 desenha slots próprios. **O padrão Salus mostra como integrar com Google Calendar real** — útil se as técnicas já usam agenda Google. A **extracção de data/hora em pt natural** é diretamente reutilizável ("pode ser quinta de tarde?").

**Veredicto:** 🟡 **ADOPTAR PARCIAL** — a extracção de data/hora entra no ADR-003 (tool `consultar_disponibilidade`/`agendar_tratamento`). Integração Google Calendar = opcional (avaliar se a clínica a usa; senão fica o calendário interno).

---

### 🟢 P4 — Inteligência de perfil estruturada numa só chamada (`classify.ts` + `intelligence.ts`)
**O que é:** por mensagem, **uma única chamada** ao Haiku devolve (via `generateObject`+Zod): sentiment, score (0-100), arquétipo, BANT acumulativo, resumo narrativo vivo, próxima acção. Tudo tipado e validado.

**Porquê para a Porcelana:** dá ao dashboard e à equipa um **score de probabilidade de marcação** + **resumo vivo** de cada conversa, sem custo extra de LLM. Substitui com vantagem o `isilda-lead-intelligence` ad-hoc. Os "arquétipos" adaptam-se à estética (ex.: noiva, grávida, pós-parto, cuidado-de-rotina).

**Veredicto:** ✅ **ADOPTAR** — melhora o Epic 7 (Dashboard) e o funil de qualificação (ADR-005). Usar `generateObject`+Zod como padrão de classificação.

---

### 🟢 P5 — Opt-out de compliance (`lib/ai/optout.ts`)
**O que é:** se o lead responde a palavra exacta de saída ("SAIR"), o sistema **para tudo na hora** (IA off, follow-up off, marca `opted_out_at`) e confirma. Match estrito (só a palavra exacta) para não desligar por engano.

**Porquê para a Porcelana:** os ~398 clientes importados **não autorizaram explicitamente** contacto automatizado (ADR-004 já assinala isto). Um opt-out limpo é **conformidade RGPD** essencial quando se começa a enviar campanhas/lembretes a uma base importada. A ISILDA tem `consentimentos` mas não este kill-switch de opt-out.

**Veredicto:** ✅ **ADOPTAR** — entra como NFR de conformidade + story no Epic 6 (fidelização/campanhas). Reforça o ADR-004.

---

### 🟡 P6 — Kanban com "agente por coluna" explícito (`lib/agents.ts`)
**O que é:** cada coluna do pipeline declara **quem a opera** — Workflow (determinístico/teal), Agente (IA/roxo), ou Humano (verde) — com badge de cor. O Design Principle nº3 da Salus: "a IA apoia o humano, deixar explícito quando automação está activa, quando escalou, quando exige pessoa".

**Porquê para a Porcelana:** clareza operacional. A Yolenia-gestora vê de relance o que a IA está a fazer sozinha e onde precisa de uma técnica/dela. Excelente para a confiança na adopção.

**Veredicto:** 🟡 **ADOPTAR (UI)** — melhoria do frontend do Kanban de agendamentos (Epic 3/7). Baixo custo, alto valor percebido.

---

## 3. O que NÃO trazer (e porquê)

| Item Salus | Decisão | Razão |
|---|---|---|
| **Vercel Workflow SDK** (migrar motor) | ❌ NÃO (v1) | A ISILDA já tem queue/debounce em produção. Migrar o motor é risco enorme sem retorno imediato. Reavaliar num v2 se a fila Deno der problemas. |
| **Pipeline de enriquecimento de leads (Python, 91 colunas, Census/Serper)** | ❌ NÃO | Específico de outreach frio B2C nos EUA (genderize, dureza de água por código postal). A Porcelana trabalha base inbound/recorrente, não cold leads enriquecidos. |
| **Arquétipos ICP da Salus** (mãe protetora, sobrevivente câncer...) | ❌ NÃO (adaptar) | Específicos de água. Mas o *mecanismo* de arquétipo (P4) adapta-se à estética. |
| **`commissions` / `deals`** | 🟡 TALVEZ | Comissões de vendedores não é dor da Porcelana (técnicas são salário, não comissão). Deals fica coberto por `agendamentos`. Backlog. |
| **Disparo em massa / cadências de cold outreach** | ❌ NÃO | A Porcelana não faz cold outreach; o `recompra-cron` da ISILDA chega para nurturing da base própria. |

---

## 4. Impacto no PRD / Arquitectura

Proponho **3 novos requisitos** e ajustes a ADRs existentes:

| Novo | Descrição | Onde entra |
|---|---|---|
| **FR26** | Escalação determinística para humano antes da resposta do agente (palavra-chave/pedido explícito/sentimento), configurável | ADR-005, Epic 2 |
| **FR27** | Módulo de **roleplay/treino**: equipa treina contra personas-IA de estética com avaliação automática (tom formal, regra de não-preço) | **NOVO — Epic 8** ou story no Epic 2 |
| **FR28** | **Opt-out de compliance** (palavra de saída para automatizada) + kill-switch de campanhas | ADR-004, Epic 6 |
| Ajuste | Classificação/inteligência via `generateObject`+Zod (sentiment/score/arquétipo-estética/BANT/resumo numa chamada) | ADR-005 + Epic 7 |
| Ajuste | Extracção de data/hora em linguagem natural + (opcional) Google Calendar | ADR-003 |
| Ajuste | Kanban com badge "agente por coluna" (workflow/IA/humano) | Frontend Epic 3/7 |

---

## 5. Recomendação Final

**Incorporar P1, P2, P4, P5 já no PRD** (escalação determinística, roleplay, inteligência estruturada, opt-out) — são baixo-custo / alto-valor e reforçam directamente garantias contratuais (adopção, qualidade, conformidade).

**P3 e P6 como melhorias incrementais** (extracção de data/hora + badge de Kanban).

**Não migrar o motor** (Vercel Workflow SDK) nem trazer o pipeline de enriquecimento — fora de âmbito e contra-KISS.

O **roleplay (P2)** é o achado mais valioso: transforma a "formação da equipa" (hoje um item vago do plano) num **produto mensurável** que ataca directamente a Garantia de Adopção.

---

## 6. Próximo passo

1. Se aprovado → o @pm/@po adicionam FR26-28 ao PRD (v1.2) e eu actualizo os ADRs 003/004/005 + crio nota sobre o módulo de roleplay.
2. Depois → @sm cria stories, incluindo possivelmente um **Epic 8 — Treino e Compliance do Agente**.

*Análise por Aria (Architect Agent) — Marca Digital · 9 de Junho de 2026*
