# Auditar Qualidade de Conteúdo

## Propósito

Realizar auditoria completa de conteúdo existente para avaliar qualidade, alinhamento com brand voice, potencial de conversão e oportunidades de melhoria.

## Pré-Condições

```yaml
pre-conditions:
  - [ ] Conteúdo a auditar identificado
    blocker: true
    error_message: "Especifique qual conteúdo será auditado"

  - [ ] URL ou ficheiro disponível
    blocker: true
    error_message: "Forneça acesso ao conteúdo"

  - [ ] Brand guidelines disponíveis
    blocker: false
    error_message: "Aceda às brand guidelines para validação"
```

## Pós-Condições

```yaml
post-conditions:
  - [ ] Relatório de auditoria completo
    blocker: true
    error_message: "Relatório não foi finalizado"

  - [ ] Recomendações documentadas
    blocker: true
    error_message: "Recomendações não foram definidas"

  - [ ] Score de qualidade atribuído
    blocker: true
    error_message: "Score não foi calculado"
```

## Critérios de Aceitação

```yaml
acceptance-criteria:
  - [ ] Auditoria cobre 8+ dimensões
    blocker: true
    validação: "Verificar: Gramática, Clareza, SEO, Conversão, Brand, UX, Técnico, Actualização"

  - [ ] Recomendações são accionáveis
    blocker: true
    validação: "Cada recomendação tem passo claro"

  - [ ] Score reflete estado actual
    blocker: true
    validação: "Score de 1-10 com justificação"
```

## Passos de Implementação

### 1. Recolher Contexto
- Qual é o objectivo deste conteúdo?
- Qual é a audiência-alvo?
- Qual é o canal (blog, landing page, email, social)?
- Quando foi publicado pela última vez?

### 2. Auditoria de Qualidade
**Gramática & Ortografia:**
- Verificar português correcto
- Pontuação e formatação

**Clareza & Estrutura:**
- Headlines são claros?
- Fluxo lógico?
- Parágrafos bem organizados?

**SEO:**
- Keywords relevantes presentes?
- Meta description optimizado?
- Headings hierárquico (H1, H2, H3)?
- Links internos apropriados?

**Conversão:**
- CTA clara e visível?
- Psychological triggers presentes?
- Objecções endereçadas?
- Urgência ou scarcity (se apropriado)?

### 3. Validação de Brand
- Tone consistente com brand?
- Vocabulário apropriado?
- Visual style alinhado?
- Mensagem central clara?

### 4. Auditoria Técnica
- Performance (carregamento rápido)?
- Mobile-friendly?
- Accessibility (a11y)?
- Links funcionam?

### 5. Calcular Score & Recomendações
- Score 1-10 baseado em critérios
- Listar top 3-5 recomendações
- Priorizar por impacto
- Fornecer passos específicos

## Dimensões de Auditoria

| Dimensão | Peso | Check |
|----------|------|-------|
| Gramática & Clareza | 20% | Sem erros, fácil ler |
| SEO | 20% | Keywords, meta, headings |
| Conversão | 20% | CTA, psychology, objecções |
| Brand Alignment | 20% | Tone, voice, mensagem |
| Técnico | 10% | Performance, mobile, a11y |
| Actualização | 10% | Data relevante? |

## Ferramentas & Recursos

- Template: content-quality-checklist.md
- Framework: Content Audit Framework
- Comparação: Competitor Content Analysis

## Validação

- [ ] Auditoria segue template
- [ ] Score é justificado
- [ ] Recomendações são accionáveis
- [ ] Relatório é profissional

## Metadados

```yaml
task: audit-content()
responsável: Content Wizard
tipo: Quality Assurance
atomic_layer: Review
duration_expected: 1-4 horas (depende do volume)
dependencies: []
tags:
  - audit
  - quality
  - content
  - review
updated_at: 2026-02-13
```

---

## Execução

Este é um workflow interactivo. Será elicitado sobre conteúdo específico a auditar.

**Próximo passo:** Executar com `*audit-content`
