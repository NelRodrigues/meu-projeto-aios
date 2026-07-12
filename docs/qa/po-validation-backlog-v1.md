# Validação de Backlog — SIC Global Minds (v1)

**Sistema de Inteligência Comercial · Marca Digital × Global Minds Consultoria**

| Campo | Detalhe |
|---|---|
| **Validador** | Pax (@po) — Product Owner |
| **Data** | 10/07/2026 |
| **Âmbito** | 32 stories (Épicos 1–6) em `docs/stories/` |
| **Fontes vinculativas** | PRD v1.0 (secções 2, 5, 6) · Arquitectura v1.0 (§2 modelo, §3 migrações, PENDENTE-1..8) |
| **Método** | 6 critérios por story (alinhamento PRD · ACs verificáveis · dependências/sequência · Dev Notes ancoradas · externos/PENDENTEs marcados · dimensão de sessão única) + adjudicação dos 10 desvios do @sm |

---

## 1. Sumário executivo

### Veredicto global: **CONDITIONAL GO** ✅⚠️

O backlog está pronto para arrancar o desenvolvimento **assim que forem aplicadas 3 correcções obrigatórias** (uma delas é gate real de compliance). A qualidade do trabalho do @sm é notável e acima do padrão da casa:

- **Ancoragem exemplar:** todas as 32 stories citam secções/migrações exactas da arquitectura como fonte vinculativa.
- **Honestidade de desvios:** cada divergência PRD↔arquitectura está marcada inline na própria story ("desvio registado"), não escondida — o que permite adjudicação limpa.
- **Dependências externas e PENDENTEs 1–8 explicitamente sinalizados** com dono e efeito de bloqueio, sem bloqueios silenciosos.
- **Disciplina KISS:** nenhuma tabela/estrutura inventada além do modelo da arquitectura; desvios que exigiriam migração extra são levantados para decisão, não impostos.

O que impede um GO limpo é um único **gate de compliance mal amarrado** (D7 — o filtro de consentimento nas RPCs de audiência é exigido pela 4.5 mas não é obrigação explícita nos ACs da 5.1) e duas ambiguidades de implementação que devem ser fechadas antes do dev (D2 espelhamento de fase; D5 tabela de consultas). Todas são correcções de **texto de story**, não de arquitectura — o modelo de dados e a sequência de épicos estão sólidos.

### Contagem de veredictos

| Veredicto | Nº stories |
|---|---|
| **GO** | 26 |
| **CONDICIONAL** | 6 |
| **NO-GO** | 0 |
| **Total** | **32** |

Nenhuma story é NO-GO. As 6 condicionais têm correcções pontuais, todas de baixo custo, listadas na §4.

---

## 2. Tabela story × veredicto

| Story | Veredicto | Observação (1 linha) |
|---|---|---|
| 1.1 Setup projecto e deploy base | **GO** | Migrações 001–002 e rename `clientes→leads` ancorados em §2.2/§3; AC4 (grep Isilda) reflecte lição real do SIC-La-Femme. |
| 1.2 Autenticação e perfis | **GO** | `team_members` antes do módulo (bug nº4), `requireAdmin` e smoke de permissões cobrem §8.1/§8.2. |
| 1.3 Subdomínio, headers, observabilidade | **GO** | AC1 depende de DNS externo (pendência 3) com fallback `.vercel.app`/`Blocked` bem definido. |
| 2.1 Modelo de dados e enums | **GO** | Gate do épico; valida (não redesenha) §2.1–2.5; D1 resolvido como AC7. |
| 2.2 Catálogo parceiros→destinos→programas | **GO** | CRUD 3 níveis + seed 016 dos 10 parceiros reais; sem invenção de campos. |
| 2.3 Pipeline kanban 8 fases | **CONDICIONAL** | D2: espelhamento `leads.pipeline_fase`↔`candidaturas.fase` deixado a "decisão de implementação" — precisa de regra fixa (ver §3-D2). |
| 2.4 Ficha de estudante 360º | **GO** | Consentimento no formulário público incorporado por coerência com FR24 (desvio menor aceite). |
| 2.5 Importação dos Excels | **CONDICIONAL** | Mecanismo da flag de revisão e do relatório persistido em aberto — recomendar `tags` + `notificacoes`, fechar antes do dev (ver §3). |
| 2.6 Financeiro | **GO** | D3 (lado 2.6) bem repartido; RLS só-admin e lógica D-5 testável com invocação provisória. |
| 2.7 RFV e 80/20 | **CONDICIONAL** | D4: RLS de materialized views não decidida (AC6 "a documentar") — fixar padrão só-admin (ver §3-D4). |
| 3.1 Canal WhatsApp, webhook, fila | **GO** | Idempotência/debounce/SKIP LOCKED reutilizados sem alteração; D10 (opt-out pré-fila) coerente com FR8. |
| 3.2 Persona, FAQ, regra de faixas | **GO** | Prompt L0–L8 exacto; C3 (camadas novas) sinalizado; 12 FAQ PT+EN da base, zero invenção. |
| 3.3 Escalação D5 e handoff | **GO** | Determinismo pré-LLM; fronteira faixas-vs-D5 documentada nos testes; safety como NFR5. |
| 3.4 Qualificação BANT e ficha | **GO** | C1 (campos novos) reforçado; escala 0–100 vinculativa; trigger conservador (low≠quente). |
| 3.5 Agendamento da consulta | **CONDICIONAL** | D5: PRD manda `consultations`, arquitectura não a define — decidir tabela leve vs `candidaturas`+registo (ver §3-D5). |
| 3.6 Inbox de supervisão | **GO** | Dupla via de pausa por humano converge no mesmo estado; edge `uazapi-send-message` com JWT correcto. |
| 3.7 Rate limits, horário, multilingue | **GO** | Distinção limites-agente vs anti-block-campanha explícita; go-live-readiness como gate. |
| 4.1 Cadência de follow-up | **GO** | Motor configurável suporta ambas as variantes do PENDENTE-2 sem código; templates fixos, nunca IA. |
| 4.2 Ponto de situação proactivo | **GO** | Separação cliente vs interno clara; anti-duplicação deixado ao @dev com dever de documentar (aceitável). |
| 4.3 Lembretes de facturas | **GO** | D3 (lado 4.3) pluga aviso ao cliente sobre a base da 2.6; fronteira D-5 cliente / vencida interna dura. |
| 4.4 Compliance retenção 2 anos | **GO** | D6: guard de existência de `email_*` na 012 bem tratado; dry-run e teste em staging bloqueantes. |
| 4.5 Consentimentos e exportação | **CONDICIONAL** | D7: define o contrato do filtro de consentimento e manda "anotar na 5.1" — mas a 5.1 não o exige (gate, ver §3-D7). |
| 4.6 Dashboard de gestão | **GO** | PENDENTE-4 tratado como inclusão-ou-backlog-registado; nada fica de fora em silêncio. |
| 5.1 Backend do módulo (migrações/edges) | **CONDICIONAL** | Não incorpora a obrigação do filtro de consentimento (D7) nas RPCs de audiência — corrigir AC (ver §3-D7). |
| 5.2 Email marketing Resend/Maily | **GO** | Preview Maily testado cedo (risco §10.2); supressão desde 1º envio; PENDENTE-7 não bloqueia dev. |
| 5.3 Campanhas WhatsApp multi-canal | **GO** | Tabela única de limites; custo Cloud API antes do envio (NFR8); PENDENTE-6 bloqueia só envio uazapi real. |
| 5.4 Templates Meta pela UI | **GO** | D9: nota sobre código de idioma pt vs pt_BR presente e suficiente; submissão cedo (Semana 2–3). |
| 5.5 Automações React Flow | **GO** | Trigger observa `pipeline_fase`; 1 nó por teste; automação real como prova ponta a ponta. |
| 6.1 Testes finais e E2E | **GO** | 3 suites + 2 smokes + E2E + PT/EN externos; nota de ignorar `tenant_id` do guia multi-tenant. |
| 6.2 Manual e formação hands-on | **GO** | Ana ao teclado (mitigação de adopção real); checklist de autonomia assinada. |
| 6.3 Go-live em produção | **CONDICIONAL** | D8: AC3 (importação real) correcto aqui, mas ordem NDA→dados e origem dos Excels merecem reforço (ver §3-D8). |
| 6.4 Entrega formal e suporte | **GO** | 8 critérios do brief §12 verificados um a um; backlog Fase 2 como proposta comercial. |

---

## 3. Adjudicação dos desvios D1–D10

> Cada desvio recebe **decisão explícita** (APROVAR / CORRIGIR / DEVOLVER) e **acção**. Regra da casa: 100% resolvidos, zero omissões.

### D1 (2.1) — `mudancas_estagio`/`consentimentos`: criar (PRD) vs herdar (arquitectura)
**Decisão: APROVAR.** A resolução da story 2.1 está correcta. O PRD (AC2) lista estas tabelas como "a criar", mas a arquitectura §2.3/§3 herda-as do clone ISILDA (migrações 002/007 no E1). A story converteu-as num **AC de validação de compatibilidade (AC7)** — que é o comportamento certo: recriar tabelas já criadas no E1 seria duplicação e risco de FK. O desvio está marcado inline na própria story.
**Acção:** nenhuma. A arquitectura prevalece sobre o PRD neste ponto (o PRD foi escrito antes do modelo de dados definitivo). Registar como PRD-drift benigno.

### D2 (2.3) — Espelhamento `leads.pipeline_fase` ↔ `candidaturas.fase`
**Decisão: CORRIGIR (baixo custo).** Ambos os campos existem no modelo (§2.4 e §2.5) e nem o PRD nem a arquitectura fixam se/como se espelham. A story 2.3 deixa-o como "decisão de implementação a documentar no código" — o que é vago demais para um gate. O @sm sugeriu trigger; concordo, **mas a regra tem de ser fixada na story, não deixada ao acaso do @dev**, porque três consumidores dependem da coerência: o overlay L3 do prompt (E3), a cadência de follow-up (fases terminais, 4.1) e o trigger de automação do módulo (5.1/5.5).
**Acção:** acrescentar à 2.3 um AC/nota que fixe: *"o trigger `AFTER UPDATE OF fase ON candidaturas` espelha a fase no `leads.pipeline_fase` do lead associado, mantendo os dois em sincronia; quando um lead tem múltiplas candidaturas, o `leads.pipeline_fase` reflecte a candidatura mais avançada (regra a documentar)."* Definir explicitamente o caso multi-candidatura evita ambiguidade a jusante.

### D3 (2.6 ↔ 4.3) — D-5 repartido: função+flag+notificação interna (2.6) / aviso ao cliente+cron (4.3)
**Decisão: APROVAR.** A fronteira é limpa e correcta. A 2.6 entrega a lógica D-5 testável (query + `lembrete_d5_enviado` + `notificacoes` interna) com invocação diária provisória; a 4.3 pluga o aviso ao cliente por WhatsApp e o cron definitivo `lembretes-tick` (migração 017). Isto respeita o PRD (2.6 AC2: "notificação interna; aviso ao cliente via agente em E4") e evita duplicar tabelas de lembretes. Ambas as stories referenciam-se mutuamente.
**Acção:** nenhuma. Fronteira exemplar de repartição entre épicos.

### D4 (2.7) — RLS de materialized views que derivam de `financeiro` (só-admin)
**Decisão: CORRIGIR (fixar padrão, não deixar "a documentar").** As materialized views `v_rfv_leads`/`v_destinos_receita` **não herdam RLS** da tabela-fonte `financeiro` (que é só-admin, §8.1). A story 2.7 AC6 reconhece a ambiguidade mas deixa a decisão para a implementação — o que abre a porta a um vazamento de dados financeiros sensíveis à `operacao`. Este é um risco de segurança, não uma preferência de estilo.
**Acção:** transformar o AC6 numa regra fixa: *"as views materializadas RFV/receita são acessíveis apenas a `admin` (mesmo perfil do `financeiro`, §8.1); a `operacao` não lê valores monetários agregados. Implementar via RLS na view (Postgres 15+) ou wrapper `SECURITY DEFINER` com verificação `team_members.role='admin'`."* A 4.6 (dashboard) deve herdar esta restrição — o painel RFV/80-20 é só-admin.

### D5 (3.5) — Tabela `consultations` (PRD) vs não-definida (arquitectura)
**Decisão: CORRIGIR (fechar a decisão antes do dev).** O PRD (3.5 AC2) manda registar em `consultations`; a arquitectura §5.3 fala em "INSERT `candidaturas.fase='consulta_agendada'` + registo consulta" sem definir a tabela. A story deixa as duas opções em aberto ("decidir e documentar antes de implementar"). Para uma sessão de agente dev única, a indecisão custa tempo e arrisca inconsistência com o dashboard (4.6 conta "consultas agendadas") e o lembrete D-1 (mesma 3.5).
**Acção:** **decisão do PO: criar tabela leve `consultations`** (migração própria numerada com rollback: `id`, `lead_id`, `candidatura_id`, `google_event_id`, `scheduled_at TIMESTAMPTZ`, `timezone`, `status`, `reminder_sent BOOLEAN`, timestamps). Fundamento: (a) o dashboard 4.6 e o lembrete D-1 precisam de uma fonte consultável distinta da fase; (b) o reagendamento (3.5) precisa localizar o evento — mais limpo numa linha própria que em campos soltos na candidatura; (c) alinha com o PRD literalmente. Custo: 1 migração pequena. Actualizar a 3.5 (fixar a opção b) e referenciar em 4.6.

### D6 (4.4) — Migração 012 corre antes do E5 mas `anonimizar_lead()` referencia `email_sends`/`email_events` → guard de existência
**Decisão: APROVAR.** A story 4.4 trata isto correctamente: a função é criada na 012 (base, E4) mas as tabelas `email_*` só nascem no E5/M_mkt_001. O AC/subtask exige "guard de existência para as tabelas `email_*` (a função não pode rebentar antes do módulo estar instalado)" com `to_regclass()` ou equivalente. Sequência coerente: a função existe cedo, só actua sobre `email_*` depois de instaladas.
**Acção:** nenhuma quanto ao desenho. Reforço de teste (já previsto): a suite da 4.4 deve incluir o caso "corre com `email_*` ainda inexistentes → não rebenta". Confirmar que o teste está no DoD.

### D7 (4.5 ↔ 5.1) — Filtro de consentimento OBRIGATÓRIO nas RPCs de audiência da 5.1
**Decisão: CORRIGIR (GATE — esta é a correcção nº1).** A 4.5 AC2 é forte: o bloqueio de campanhas a contactos sem consentimento `marketing` "actua ao nível da resolução de audiência (RPCs `populate_email_campaign_leads`/`populate_campaign_leads`), não apenas na UI" e a story diz "a 5.1 é obrigada a usá-lo (anotar na 5.1 ao planear o E5)". **Mas a 5.1 não tem essa nota nem esse AC.** A 5.3 (WhatsApp) menciona "campanhas só a contactos com consentimento (FR24)", mas a 5.2 (email) **não** o menciona explicitamente ao nível da RPC. Resultado: o gate de compliance pode ficar dependente da UI ou meio-aplicado no email — inaceitável para o cliente cuja certificação internacional é o diferencial do projecto.
**Acção (dupla):**
1. **Corrigir a 5.1:** acrescentar AC — *"as RPCs de audiência (`populate_email_campaign_leads`, `populate_campaign_leads`, `get_email_audience_count`) integram o filtro de consentimento definido na story 4.5 (contrato/função SQL): contacto sem consentimento `marketing` válido e não revogado NUNCA entra numa audiência, em qualquer canal. Verificado por teste na 5.1 e na 5.2."*
2. **Reforçar a 5.2 AC4/5:** tornar explícito que a audiência de email respeita o mesmo filtro de consentimento (hoje só a supressão de descadastro está explícita — supressão ≠ consentimento).
3. Confirmar ordem: a 4.5 entrega o filtro como função SQL/contrato **antes** de a 5.1 aplicar as RPCs. Se a 4.5 (E4) e a 5.1 (E5) forem paralelizadas, a função de consentimento é pré-requisito da 5.1.

### D8 (6.3) — AC3 (importação de dados reais em produção) adicionado pelo @sm
**Decisão: APROVAR (manter na 6.3) com reforço de texto.** A importação de dados reais **pertence** ao go-live (6.3), não à 2.5 — a 2.5 constrói e testa o mecanismo com fixtures/staging; a 6.3 corre-o em produção após o NDA. O @sm acertou em separar. O AC3 está no sítio certo.
**Acção:** reforçar a **ordem rígida** já enunciada na 6.3 ("NDA → número real → dados reais → acompanhamento") elevando-a de Dev Note a restrição explícita do AC3: *"a importação de Excels reais só corre APÓS o gate NDA (AC1) confirmado; correr antes é violação de compliance."* Confirmar que os 3 Excels usados são as versões recebidas a 30/06 (fonte já fixada na 2.5) — evita importar versão desactualizada em produção.

### D9 (5.4) — Código de idioma Meta (`pt_BR` no guia vs pt-AO da GM)
**Decisão: APROVAR.** A nota da 5.4 ("idioma dos templates: pt — não pt_BR do exemplo do guia — confirmar código de idioma disponível na Meta para PT; conteúdo em pt-AO pré-Acordo") é suficiente e correcta. A Meta não tem `pt_AO`; o código disponível é `pt_PT` ou `pt_BR` — a story instrui confirmar e usar `pt_PT` com **conteúdo** em pt-AO pré-Acordo. A distinção código-de-idioma-Meta vs ortografia-do-conteúdo está bem feita.
**Acção:** micro-precisão (opcional): fixar `pt_PT` como código-alvo na story para remover a última ambiguidade ("confirmar" → "usar `pt_PT`; conteúdo pt-AO pré-Acordo"). Não bloqueia.

### D10 (3.1) — Opt-out no receiver (pré-fila) vs FR8 "antes do agente"
**Decisão: APROVAR.** Totalmente coerente. FR8 exige opt-out "processado antes do agente"; a 3.1 processa-o no `uazapi-webhook-receiver`, **pré-fila** — ainda mais cedo que "antes do agente", garantindo determinismo (princípio 6 da arquitectura). A distinção opt-out (receiver, 3.1) vs escalação D5 (processador da fila, 3.3) está documentada e ambos partilham o enum `pause_reason`. Implementação superior ao requisito.
**Acção:** nenhuma.

---

## 4. Correcções exigidas antes do dev

> Todas de baixo custo e de texto de story (não de arquitectura). Priorizadas por severidade.

| # | Severidade | Story(s) | Correcção | Dono |
|---|---|---|---|---|
| C1 (D7) | **CRÍTICA (gate compliance)** | 5.1, 5.2 | Tornar o filtro de consentimento da 4.5 obrigação explícita nas RPCs de audiência de **todos** os canais (email + WhatsApp), com teste no DoD. Confirmar 4.5 entrega a função SQL antes da 5.1. | @sm (edita stories) → @po revalida |
| C2 (D4) | **ALTA (segurança)** | 2.7, 4.6 | Fixar RLS só-admin nas materialized views RFV/receita (AC6 deixa de ser "a documentar" e passa a regra); dashboard 4.6 herda a restrição no painel RFV/80-20. | @sm → @po |
| C3 (D5) | **ALTA (desbloqueio dev)** | 3.5, 4.6 | Fechar a decisão: criar tabela leve `consultations` (migração própria c/ rollback). Actualizar 3.5 (opção b fixada) e referenciar em 4.6 (contagem "consultas agendadas"). | @architect (define DDL) + @sm (edita story) |
| C4 (D2) | **MÉDIA** | 2.3 | Fixar a regra de espelhamento `candidaturas.fase`→`leads.pipeline_fase` via trigger, incl. caso multi-candidatura (fase mais avançada). | @sm → @po |
| C5 | **MÉDIA** | 2.5 | Fechar mecanismo da flag de revisão (recomendação: `leads.tags='importacao_rever'`, sem migração nova) e do relatório persistido (`notificacoes` ou JSON em Storage). Evita decisão em runtime. | @sm |
| C6 (D8) | **BAIXA (reforço)** | 6.3 | Elevar a ordem "NDA→dados reais" de Dev Note a restrição do AC3; confirmar versão 30/06 dos Excels. | @sm |
| C7 (D9) | **BAIXA (opcional)** | 5.4 | Fixar `pt_PT` como código de idioma Meta (conteúdo pt-AO). | @sm |

**Nota de processo:** nenhuma destas correcções altera o modelo de dados nuclear (§2), a sequência de épicos (§10.1) ou os contratos de edge (§4). São refinamentos de ACs. Recomendo aplicá-las em bloco e devolver as 6 stories condicionais a `Approved` após revalidação do @po.

---

## 5. Observações transversais (não bloqueantes, para o dev ter presente)

- **PENDENTEs 1–8 bem geridos:** todos os 8 estão mapeados a stories concretas com dono e efeito. Nenhum bloqueia o *arranque* do desenvolvimento — só afinam parametrização (1,2,3,4) ou bloqueiam envios/go-live específicos (6,7,8). PENDENTE-5 (titularidade) é comercial e resolve-se na 6.4.
- **Dimensão das stories:** todas cabem numa sessão de agente dev única. As mais densas (5.1 backend do módulo, 3.2 prompt em camadas, 2.1 modelo de dados) estão bem delimitadas por ACs verificáveis e não transbordam. 5.1 é a mais carregada mas é puramente backend/sequencial — aceitável.
- **Sequência sem ciclos:** verificada. E1→E2→E3→(E4 ∥ E5)→E6. Nenhuma story depende de trabalho posterior. A migração 012 (E4) antes das `email_*` (E5) é o único caso de "criar antes de usar", correctamente resolvido com guard (D6). O filtro de consentimento (4.5, E4) antes das RPCs (5.1, E5) exige C1 para não inverter.
- **Idempotência e degradação graciosa** aparecem consistentemente como ACs (3.1, 2.5, 4.2, 4.3, 4.4) — alinhado com NFR1/NFR11.
- **Regra "sem invenção de dados"** respeitada em toda a linha (catálogo com NULLs onde falta info, importação sem correcções silenciosas, RFV só sobre dados reais).

---

## 6. Resolution Tracking

> Regra da casa: 100% dos achados resolvidos ou encaminhados, zero omissões.

| Achado | Estado | Acção |
|---|---|---|
| D1 (2.1 tabelas herdadas) | **RESOLVED — APROVAR** | Nenhuma; PRD-drift benigno, arquitectura prevalece. |
| D2 (2.3 espelhamento fase) | **FIXED** | C4 aplicada — story 2.3 v1.1 (novo AC7: trigger de espelhamento `candidaturas.fase`→`leads.pipeline_fase` + regra da candidatura mais avançada no caso multi-candidatura + testes SQL). |
| D3 (2.6↔4.3 D-5 repartido) | **RESOLVED — APROVAR** | Nenhuma; fronteira exemplar. |
| D4 (2.7 RLS materialized views) | **FIXED** | C2 aplicada — story 2.7 v1.1 (AC6 passa a regra fixa só-admin: RLS na view ou wrapper `SECURITY DEFINER` com check `team_members.role='admin'`) + story 4.6 v1.1 (painéis RFV/80-20 herdam a restrição só-admin). |
| D5 (3.5 tabela consultations) | **FIXED** | C3 aplicada — Arquitectura v1.1 (DDL de `consultations` no §2.5 + migração 018 no §3) + story 3.5 v1.1 (AC3/AC5 e tasks fixam a opção b) + story 4.6 v1.1 (KPI "consultas agendadas" lê `consultations`). |
| D6 (4.4 guard email_*) | **RESOLVED — APROVAR** | Confirmar teste "corre sem email_*" no DoD. |
| D7 (4.5↔5.1 consentimento) | **FIXED (GATE)** | C1 aplicada — story 5.1 v1.1 (novo AC8: filtro de consentimento da 4.5 obrigatório nas 3 RPCs de audiência + pré-requisito de ordem 4.5→5.1 + teste), story 5.2 v1.1 (AC4/AC5: audiência email respeita o filtro; supressão ≠ consentimento, verificações cumulativas) e story 5.3 v1.1 (AC4: filtro imposto ao nível da RPC, nunca só na UI). |
| D8 (6.3 importação real) | **FIXED** | C6 aplicada — story 6.3 v1.1 (ordem NDA→número→dados→acompanhamento elevada a restrição do AC3; versões 30/06 dos Excels confirmadas como fonte única). |
| D9 (5.4 código idioma Meta) | **FIXED** | C7 aplicada — story 5.4 v1.1 (`pt_PT` fixado como código de idioma Meta no AC4 e Dev Notes; conteúdo pt-AO pré-Acordo). |
| D10 (3.1 opt-out pré-fila) | **RESOLVED — APROVAR** | Nenhuma; implementação superior ao FR8. |
| Flag de revisão / relatório (2.5) | **FIXED** | C5 aplicada — story 2.5 v1.1 (flag = tag `'importacao_rever'` em `leads.tags`; relatório = 1 linha em `notificacoes` com sumário JSON; sem migração nova). |
| Anti-duplicação (4.2) deixada ao @dev | **RESOLVED — ACEITE** | Baixo risco; dever de documentar já no AC. Sem correcção. |
| PENDENTE-4 dashboard (4.6) | **RESOLVED — ACEITE** | Tratado como inclusão-ou-backlog; sem correcção. |

**Total: 13/13 achados resolvidos (100%).** — 6 APROVAR sem acção · **7 FIXED** (correcções C1–C7 aplicadas a 10/07/2026 por River @sm: stories 2.3/2.5/2.7/3.5/4.6/5.1/5.2/5.3/5.4/6.3 → v1.1 + Arquitectura → v1.1) · 1 ACEITE com dever de documentar. **Correcções C1–C7: 100% FIXED** — as 6 stories condicionais ficam prontas para revalidação do @po.

---

## 7. Recomendação final

**CONDITIONAL GO.** Aplicar as correcções C1–C6 (C7 opcional) — todas edições de story, custo estimado < 2h de @sm/@architect — e revalidar as 6 stories condicionais. Feito isto, o backlog fica **GO limpo** para arrancar o desenvolvimento pelo Épico 1. O modelo de dados, a sequência de épicos e os contratos técnicos estão sólidos; nada na arquitectura precisa de mudar.

Prioridade absoluta antes de qualquer campanha: **C1 (filtro de consentimento)** — é o único achado com risco de compliance directo sobre o diferencial contratual do cliente.

---

*Marca Digital · Consultoria AI First · Luanda, Angola*
*Validação de Backlog SIC Global Minds v1 — 10/07/2026 · Pax (@po) · Confidencial*
*— Pax, equilibrando prioridades 🎯*
