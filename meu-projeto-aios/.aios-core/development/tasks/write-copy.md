# Escrever Copy Persuasivo

## Propósito

Criar copy persuasivo e focado em conversão para qualquer canal (página web, email, social media, ads), aplicando princípios de psicologia de copywriting e alinhando com a voz de marca.

## Pré-Condições

```yaml
pre-conditions:
  - [ ] Objectivo de conversão definido
    blocker: true
    error_message: "Defina claramente o objectivo (sign-up, compra, download, etc)"

  - [ ] Audiência-alvo identificada
    blocker: true
    error_message: "Identifique a audiência específica para este copy"

  - [ ] Brand voice guidelines disponíveis
    blocker: false
    error_message: "Aceda às brand guidelines"
```

## Pós-Condições

```yaml
post-conditions:
  - [ ] Copy escrito e pronto
    blocker: true
    error_message: "Copy não foi finalizado"

  - [ ] Validação de brand voice passada
    blocker: true
    error_message: "Copy não segue voz de marca"

  - [ ] Revisão de qualidade completada
    blocker: true
    error_message: "Revisão de qualidade não foi feita"
```

## Critérios de Aceitação

```yaml
acceptance-criteria:
  - [ ] Copy contém headline e CTA clara
    blocker: true
    validação: "Verificar presença de headline e call-to-action"

  - [ ] Alinhado com brand voice e tom
    blocker: true
    validação: "Comparar com brand guidelines"

  - [ ] Sem erros de ortografia ou gramática
    blocker: true
    validação: "Verificar português correcto"

  - [ ] Copy tem potencial de conversão
    blocker: false
    validação: "Usar checklist de conversão"
```

## Passos de Implementação

### 1. Entender o Contexto
- Qual é o objectivo específico?
- Quem é a audiência exacta?
- Qual é o contexto (landing page, email, social, etc)?
- Qual é o estado actual da audiência (awareness, consideration, decision)?

### 2. Estruturar o Copy
- Headline: Capture atenção e promessa clara
- Subheadline: Elaborate ou detalhe
- Body: Benefícios, prova social, eliminação de objecções
- CTA: Chamada à ação clara e urgência

### 3. Aplicar Psicologia de Copywriting
- Personalização e relevância
- Prova social (testimoniais, números, estudos)
- Escassez ou urgência (se apropriado)
- Eliminação de objecções comuns
- Benefício claro (não apenas features)

### 4. Validar Voz de Marca
- Tone está consistente?
- Vocabulário apropriado?
- Estrutura de frase alinhada?

### 5. Revisar e Otimizar
- Ler em voz alta para fluidez
- Eliminar redundâncias
- Fortalecer verbos e adjectivos
- Final check de CTA clarity

## Ferramentas & Recursos

- Template: copy-template.md
- Framework: Copywriting Psychology
- Checklist: content-quality-checklist.md

## Validação

- [ ] Copy segue template
- [ ] Objectivo de conversão claro
- [ ] Brand voice validado
- [ ] Sem erros linguísticos

## Metadados

```yaml
task: write-copy()
responsável: Content Wizard
tipo: Content Creation
atomic_layer: Execution
duration_expected: 1-3 horas
dependencies: []
tags:
  - copywriting
  - conversion
  - content
updated_at: 2026-02-13
```

---

## Execução

Este é um workflow interactivo. Será elicitado sobre contexto, audiência e objectivos.

**Próximo passo:** Executar com `*write-copy`
