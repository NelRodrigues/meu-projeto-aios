# 🎬 Content Distillery — Guia Rápido

Bem-vindo ao **Content Distillery**, um Squad AIOS de 9 agentes que transforma livestreams do YouTube em frameworks estruturados, heurísticas e conteúdo multi-plataforma.

## 🚀 Ativação Rápida

### 1. Activar o Squad Chief
```
@content-distillery:distillery-chief
```

### 2. Comandos Disponíveis

#### Extrair Frameworks (Leve)
```
*extract https://youtube.com/watch?v=VIDEO_ID
```
Outputs:
- Frameworks extraídos
- Modelos mentais
- Heurísticas práticas
- Base de conhecimento actualizada

#### Pipeline Completo (Pesado)
```
*distill https://youtube.com/watch?v=VIDEO_ID
```
Outputs:
- Tudo acima +
- 5 camadas de resumo progressivo
- 80+ ideias de conteúdo
- 60+ peças prontas para plataforma
- Calendário de 4 semanas

#### Derivar Conteúdo de Frameworks Existentes
```
*derive outputs/distillery/SLUG/frameworks.yaml
```

#### Comparar Dois Livestreams
```
*compare outputs/distillery/SLUG_A/ outputs/distillery/SLUG_B/
```

#### Ver Status
```
*status
```

---

## 👥 Os 9 Agentes

**Orchestrator:**
- `distillery-chief` — Rota requisições, gerencia pipeline, enforça quality gates

**Tier 0 (Diagnóstico):**
- `tacit-extractor` — Cedric Chin (Knowledge RPD)
- `model-identifier` — Shane Parrish (Mental models library)

**Tier 1 (Masters):**
- `knowledge-architect` — Tiago Forte (BASB, Progressive Summarization)
- `content-atomizer` — Gary Vaynerchuk (Reverse Pyramid, 64-piece rule)

**Tier 2 (Systematizers):**
- `idea-multiplier` — Nicolas Cole & Dickie Bush (4A Framework)
- `ecosystem-designer` — Dan Koe (Content Map, 2-Hour Ecosystem)
- `production-ops` — Justin Welsh (Content OS, 730-Day Library)

**Tier 3 (Specialist):**
- `youtube-strategist` — Paddy Galloway (CCN Rule, Clickbait Theory)

---

## 📊 Pipeline Completo (6 fases)

```
1. INGEST
   └─ Download vídeo + transcrição

2. EXTRACT
   ├─ Extrai conhecimento tácito
   └─ Identifica frameworks & modelos

3. DISTILL
   ├─ 5 camadas de progressão
   ├─ Classificação PARA
   └─ Intermediários

4. MULTIPLY
   ├─ 4A Framework angles
   ├─ Variações de formato
   └─ Scoring de ideias

5. PRODUCE
   ├─ Conteúdo platform-specific
   ├─ Calendário de distribuição
   └─ Batch production

6. OPTIMIZE
   └─ YouTube-specific (títulos, thumbnails, tags)
```

---

## 📁 Estrutura de Outputs

```
outputs/distillery/
└── {SLUG}/
    ├── transcript.md              # Transcrição do vídeo
    ├── frameworks.yaml            # Frameworks extraídos
    ├── heuristics.yaml            # Heurísticas práticas
    ├── ideas/
    │   ├── scored-ideas.yaml      # 80+ ideias scored
    │   └── content-map.md         # Mapa visual
    ├── content/
    │   ├── twitter.md             # 5-10 tweets
    │   ├── linkedin.md            # 3-5 posts
    │   ├── youtube.md             # Descrição otimizada
    │   └── long-form/             # 5 artigos
    ├── calendar.md                # 4-week distribution
    └── distillation-report.md     # Full report
```

---

## 🎯 Casos de Uso

### Para Criadores de Conteúdo
```
*distill https://youtube.com/watch?v=livestream
→ 60+ peças prontas em 1 comando
```

### Para Product Managers
```
*extract https://youtube.com/watch?v=expert-talk
→ Frameworks + mental models para design decisions
```

### Para Pesquisadores
```
*compare output1/ output2/
→ Meta-frameworks emergentes
```

### Para Equipes de Marketing
```
*derive outputs/distillery/slug/frameworks.yaml
→ Calendário + conteúdo automatizado
```

---

## ⚙️ Dependências Necessárias

O Squad requer:
- **youtube-transcript** — API de legendas do YouTube
- **whisper** — OpenAI Whisper para transcrição
- **ffmpeg** — Processamento de áudio

Se tiver erro de dependência:
```
@aios-master
*validate-component content-distillery
```

---

## 🔄 Fluxo Típico

```
1. Encontre um livestream interessante
2. Execute: @content-distillery:distillery-chief *distill URL
3. Aguarde processamento (10-30 min dependendo do tamanho)
4. Verifique outputs/distillery/{SLUG}/
5. Use content/ para posts imediatos
6. Aproveite frameworks para futura estratégia
```

---

## 💡 Dicas

- **Primeiras vezes?** Use `*extract` para aprender antes de `*distill`
- **Base de conhecimento?** Verifique `data/content-distillery-kb.md`
- **Customizar?** Edite `config.yaml` para preferências
- **Problema?** Execute `@distillery-chief *status` para diagnosticar

---

**Content Distillery v1.0.0**
Construído com pesquisa de 8 elite minds na extração de conteúdo.

Pronto? Vamos lá! 🚀
