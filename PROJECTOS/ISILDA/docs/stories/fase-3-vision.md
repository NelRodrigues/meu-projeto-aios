# Fase 3 — Visao Multi-Modal
## Stories 8.1 a 8.3

---

## Story 8.1 — LLM Client: Claude Vision (Multimodal)

**Epic:** E8 — Visao Multi-Modal
**Prioridade:** P0 | **Estimativa:** 0.5 dia
**PRD refs:** FR24
**Arq refs:** Seccao 3.2, 4.2

### Descricao
Como @dev, quero que o llm-client suporte chamadas multimodais (texto + imagem) ao Claude Vision, para que o pipeline de visao funcione.

### Criterios de Aceitacao
- [ ] Funcao `callVision(imageBase64, prompt, model="claude-sonnet-4-5")` em `llm-client.ts`:
  - Envia imagem como base64 no content array `[{type: "image", source: {type: "base64", ...}}, {type: "text", text: prompt}]`
  - Retorna `{ content: string (JSON parseable), model, tokens_input, tokens_output, latency_ms }`
- [ ] Funcao `generateEmbedding(text)`:
  - Usar Supabase AI (gte-small, 384 dims) via `supabase.functions.invoke('embed')` ou pg function
  - Fallback: armazenar descricao sem embedding (gerar em background)
  - Retorna `number[]` (384 dimensoes)
- [ ] Testes manuais:
  - Enviar foto de bolo de teste → receber JSON com estilo, tema, complexidade
  - Gerar embedding de descricao textual → vector de 384 dims

### Ficheiros a Editar
- `supabase/functions/_shared/llm-client.ts` (adicionar callVision + generateEmbedding)

---

## Story 8.2 — Edge Function: process-vision

**Epic:** E8 — Visao Multi-Modal
**Prioridade:** P0 | **Estimativa:** 2 dias
**PRD refs:** FR24-FR27
**Arq refs:** Seccao 3.4, 4.4

### Descricao
Como @dev, quero ter o pipeline completo de Vision a funcionar: descarregar imagem, analisar com Claude Vision, gerar embedding, fazer similarity search e calcular orcamento.

### Criterios de Aceitacao
- [ ] Edge Function `process-vision` criada com fluxo:
  1. Receber `{ cliente_id, media_url, message_id, caption }`
  2. Descarregar imagem da `media_url` (UAZAPI)
  3. Optimizar: resize max 1024px, compressao JPEG 80% (usar `sharp` ou fetch com query params de Supabase Image Transformations)
  4. Guardar em Supabase Storage (`vision/{cliente_id}/{timestamp}.jpg`)
  5. Chamar `callVision()` com prompt:
     ```
     Analisa este bolo/doce. Responde APENAS em JSON valido:
     {"estilo":"...","tema":"...","cores":["..."],"elementos":["..."],
      "complexidade":1-5,"tamanho_estimado":"...","descricao":"..."}
     ```
  6. Parse JSON da resposta (com try/catch e fallback)
  7. Gerar embedding da `descricao` via `generateEmbedding()`
  8. Chamar RPC `match_referencias_visuais(embedding, 0.3, 3)`
  9. Calcular orcamento estimado:
     - Se similares encontrados: usar preco do mais similar, ajustar por complexidade e tamanho
     - Se nenhum similar: usar preco medio da categoria detectada
  10. Retornar `{ analysis, similares, orcamento, storage_path }`
- [ ] Guardar resultado em `ai_agent_logs` (log_type='vision_analysis')
- [ ] Fallbacks:
  - Foto ilegivel: retornar `{ error: "image_unclear" }` → bot pede descricao textual
  - Nenhum similar: retornar `{ similares: [], custom: true }` → bot informa design personalizado
  - Claude timeout: retry 1x, depois fallback textual
  - Embedding indisponivel: guardar descricao, embedding gerado em background

### Ficheiros a Criar
- `supabase/functions/process-vision/index.ts`
- `supabase/functions/process-vision/image-utils.ts` (resize, compress)
- `supabase/functions/process-vision/pricing.ts` (calculo orcamento)

---

## Story 8.3 — Integracao Vision + Agente IA

**Epic:** E8 — Visao Multi-Modal
**Prioridade:** P0 | **Estimativa:** 1.5 dias
**PRD refs:** FR24-FR27
**Arq refs:** Seccao 4.3 (webhook trigger), 4.5 (tool calling)

### Descricao
Como cliente da Isi, quero enviar uma foto de bolo no WhatsApp e receber 3 sugestoes do portfolio com precos, para escolher facilmente o que quero.

### Criterios de Aceitacao
- [ ] Webhook receiver (Story 2.2) ja detecta imagens e trigera `process-vision` — validar integracao
- [ ] ai-sales-agent detecta intencao REFERENCIA_VISUAL quando mensagem tem media_type='image'
- [ ] Fluxo completo:
  1. Cliente envia foto → webhook guarda mensagem + trigera vision
  2. Vision analisa → retorna similares + orcamento
  3. Agente compoe resposta personalizada:
     ```
     "Adorei a referencia! Vi que procura um bolo {estilo} com tema {tema}.
      No meu portfolio tenho 3 opcoes parecidas:"
     ```
  4. Agente envia 3 fotos via UAZAPI `/send/media` (usando `thumbnail_url` dos similares)
  5. Agente envia preco estimado:
     ```
     "Para um bolo deste estilo, {tamanho}, o orcamento fica em {preco} Kz.
      Para {data} tenho disponibilidade. Quer avancar?"
     ```
- [ ] Iteracao conversacional:
  - "Mais pequeno" → recalcular com tamanho menor
  - "Sem flores" → refinar busca com exclusao
  - "Com cores da Frozen" → nova busca por similaridade com prompt ajustado
- [ ] Tool `enviar_foto_portfolio(referencia_id)`:
  - Busca URL da foto em `referencias_visuais`
  - Envia via UAZAPI `/send/media`
- [ ] Timeout: se vision demorar > 15s, bot envia "Estou a analisar a sua foto, um momento..."

### Ficheiros a Editar
- `supabase/functions/ai-sales-agent/queue-processor.ts` (detectar imagem, chamar vision, compor resposta)
- `supabase/functions/ai-sales-agent/communication.ts` (adicionar envio de media)
- `supabase/functions/uazapi-webhook-receiver/index.ts` (validar trigger vision)

---

*-- River, removendo obstaculos 🌊*
