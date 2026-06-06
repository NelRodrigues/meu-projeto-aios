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
- [x] Funcao `callVision(imageBase64, mediaType, prompt, apiKey, model)` em `llm-client.ts`
- [x] Funcao `generateEmbedding(text, supabaseUrl, supabaseKey)` com fallback zero vector
- [ ] Testes manuais com foto de bolo real

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
- [x] Edge Function `process-vision` criada:
  - Download imagem → base64 → Claude Vision → parse JSON
  - Guardar no Storage (vision bucket)
  - Gerar embedding → similarity search
  - Calcular orcamento (similar ou categoria)
  - Guardar log em ai_agent_logs
  - Fallbacks: image_unclear, embedding indisponivel, storage fail

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
- [x] Webhook receiver trigera process-vision quando media_type='image'
- [x] ai-sales-agent inclui contexto vision no system prompt (se analise disponivel em <2min)
- [x] Tool `enviar_foto_portfolio(referencia_id)` — busca URL e retorna para envio
- [x] Tool `sendMediaMessage` em communication.ts para envio de imagens via UAZAPI
- [x] Contexto vision injected no system prompt com estilo, tema, orcamento estimado

### Ficheiros a Editar
- `supabase/functions/ai-sales-agent/queue-processor.ts` (detectar imagem, chamar vision, compor resposta)
- `supabase/functions/ai-sales-agent/communication.ts` (adicionar envio de media)
- `supabase/functions/uazapi-webhook-receiver/index.ts` (validar trigger vision)

---

*-- River, removendo obstaculos 🌊*
