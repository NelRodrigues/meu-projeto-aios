# Desenvolver Estratégia de Conteúdo

## Propósito

Criar uma estratégia de conteúdo estruturada e alinhada com objectivos de negócio, identificando audiência, canais, pilares de conteúdo e plano de distribuição.

## Pré-Condições

```yaml
pre-conditions:
  - [ ] Objectivos de negócio definidos
    blocker: true
    error_message: "Defina os objectivos de negócio antes de criar a estratégia"

  - [ ] Audiência-alvo identificada
    blocker: true
    error_message: "Identifique a audiência-alvo"

  - [ ] Recursos disponíveis
    blocker: false
    error_message: "Confirme disponibilidade de recursos"
```

## Pós-Condições

```yaml
post-conditions:
  - [ ] Documento de estratégia criado
    blocker: true
    error_message: "Documento não foi criado"

  - [ ] Pilares de conteúdo definidos (3-5)
    blocker: true
    error_message: "Defina os pilares de conteúdo"

  - [ ] Canais de distribuição mapeados
    blocker: true
    error_message: "Mapeie os canais de distribuição"
```

## Critérios de Aceitação

```yaml
acceptance-criteria:
  - [ ] Estratégia documento contém todos os elementos
    blocker: true
    validação: "Verificar secções: Audiência, Objectivos, Pilares, Canais, KPIs"

  - [ ] Alinhamento com objectivos de negócio confirmado
    blocker: true
    validação: "Validar com stakeholder de negócio"

  - [ ] Calendário editorial inicial definido
    blocker: false
    validação: "Próximos 3 meses de conteúdo planeados"
```

## Passos de Implementação

### 1. Recolha de Informações
- Reunir com stakeholders sobre objectivos de negócio
- Analisar audiência-alvo (demographics, comportamento, dores)
- Identificar recursos disponíveis (equipa, budget, ferramentas)

### 2. Definir Pilares de Conteúdo
- Identificar 3-5 temas principais
- Alinhar com objectivos de negócio
- Documentar como cada pilar serve a audiência

### 3. Mapear Canais de Distribuição
- Seleccionar canais apropriados (blog, social, email, etc)
- Definir frequência por canal
- Priorizar por ROI potencial

### 4. Estabelecer KPIs
- Definir métricas de sucesso
- Criar dashboard de monitoramento
- Definir frequência de revisão

### 5. Criar Calendário Inicial
- Planificar próximos 3 meses
- Distribuir conteúdo por canal
- Identificar datas-chave

## Ferramentas & Recursos

- Template: content-strategy-tmpl.md
- Framework: Copywriting Psychology
- Dados: Brand Voice Guidelines

## Validação

- [ ] Documento segue template AIOS
- [ ] YAML syntax válido
- [ ] Alinhamento com brand voice confirmado
- [ ] Stakeholders aprovaram

## Metadados

```yaml
task: content-strategy()
responsável: Content Wizard
tipo: Strategy
atomic_layer: Planning
duration_expected: 3-5 horas
dependencies: []
tags:
  - content
  - strategy
  - planning
updated_at: 2026-02-13
```

---

## Execução

Este é um workflow interactivo. Será elicitado em cada passo para garantir alinhamento com objectivos.

**Próximo passo:** Executar com `*content-strategy`
