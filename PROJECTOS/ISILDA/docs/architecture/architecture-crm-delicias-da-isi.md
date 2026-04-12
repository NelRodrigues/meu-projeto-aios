# Arquitectura Tecnica — CRM Delicias da Isi
## Confeitaria Artesanal Inteligente

**Versao:** 1.0
**Data:** 12 de Abril de 2026
**Autor:** Aria (Architect Agent)
**PRD-fonte:** `docs/prd/prd-crm-delicias-da-isi.md` (v1.0)

---

## 1. Visao Geral da Arquitectura

### 1.1 Diagrama de Alto Nivel

```
                    ┌──────────────────────────────────┐
                    │        CLIENTE (WhatsApp)         │
                    │  Envia: texto, foto, audio, doc   │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │          UAZAPI (WhatsApp)        │
                    │  instancia.uazapi.com             │
                    │  Webhook → messages.upsert        │
                    └──────────────┬───────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────┐
│                        VERCEL (Next.js 16)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ /api/webhooks/uazapi (proxy)                                │   │
│  │  → Forward para Edge Function + trigger agente IA           │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Frontend: App Router + Tailwind v4 + PWA                    │   │
│  │  Ecras: Inbox | Kanban | Calendario | Clientes | Dashboard  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬────────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────────┐
│                    SUPABASE (Backend-as-a-Service)                 │
│                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │ PostgreSQL   │  │  Edge        │  │  Realtime              │   │
│  │ + pgvector   │  │  Functions   │  │  (WebSocket)           │   │
│  │ + pg_cron    │  │  (Deno)      │  │  → inbox live          │   │
│  │ + RLS        │  │              │  │  → notificacoes        │   │
│  │              │  │              │  │  → pedidos             │   │
│  ├─────────────┤  ├──────────────┤  ├────────────────────────┤   │
│  │ Storage     │  │ Auth (JWT)   │  │  PGMQ (fila)           │   │
│  │ (fotos)     │  │ + RLS        │  │  → debounce msgs       │   │
│  └─────────────┘  └──────────────┘  └────────────────────────┘   │
└──────────────────────────┬────────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                  │
┌─────────▼─────────┐           ┌───────────▼───────────┐
│   Anthropic API    │           │   Supabase Storage    │
│                    │           │                       │
│  Haiku 4.5         │           │  Portfolio fotos      │
│  (classificacao)   │           │  Comprovativos        │
│                    │           │  Media WhatsApp       │
│  Sonnet 4.5        │           │                       │
│  (respostas)       │           │                       │
│  (Vision)          │           │                       │
└────────────────────┘           └───────────────────────┘
```

### 1.2 Principios Arquitecturais

1. **Reutilizacao maxima** — 85-90% do codigo vem dos CRMs Nelma + Elsa
2. **Evento-driven** — Webhook UAZAPI -> PGMQ -> Edge Function (assincrono)
3. **Mobile-first** — PWA optimizada para Android com 4G instavel
4. **Custo-consciente** — Haiku para classificacao, Sonnet so quando necessario
5. **Idempotencia** — Todas as operacoes de webhook sao idempotentes
6. **RLS everywhere** — Row-Level Security em todas as tabelas

---

## 2. Validacao do Schema SQL

### 2.1 Revisao das 22 Tabelas do PRD

| # | Tabela | Origem | Status | Notas de Validacao |
|---|--------|--------|--------|--------------------|
| 1 | `profiles` | Nelma 001 | OK | Reutilizar directamente |
| 2 | `clientes` | Nelma 002 (leads) + Elsa 001 (contacts) | ADAPTAR | Renomear + adicionar campos confeitaria |
| 3 | `interacoes` | Nelma 003 | OK | Reutilizar directamente |
| 4 | `mudancas_estagio` | Nelma 004 | OK | Reutilizar directamente |
| 5 | `conversas_whatsapp` | Nelma 010 | ADAPTAR | Adaptar campo `lead_id` -> `cliente_id` |
| 6 | `mensagens_whatsapp` | Nelma 010 / Elsa 002 | ADAPTAR | Usar schema Elsa (mais completo com media) |
| 7 | `notificacoes` | Nelma 011 | OK | Reutilizar directamente |
| 8 | `templates_whatsapp` | Nelma 005 | OK | Adaptar conteudo para confeitaria |
| 9 | `consentimentos` | Nelma 012 | OK | Reutilizar directamente |
| 10 | `integration_keys` | Elsa 002 | OK | Reutilizar directamente |
| 11 | `ai_sales_agents` | Elsa 002 / Nelma 026 | ADAPTAR | Adaptar prompt + intencoes confeitaria |
| 12 | `ai_agent_conversations` | Elsa 002 / Nelma 026 | ADAPTAR | `contact_id` -> `cliente_id` |
| 13 | `ai_agent_message_queue` | Nelma 026 | OK | Reutilizar directamente |
| 14 | `webhook_processed_messages` | Elsa 011 | OK | Reutilizar directamente |
| 15 | `produtos_catalogo` | **NOVO** | CRIAR | Schema do PRD validado |
| 16 | `referencias_visuais` | **NOVO** | CRIAR | Requer pgvector — ver seccao 3 |
| 17 | `pedidos` | **NOVO** | CRIAR | Schema do PRD validado com ajustes |
| 18 | `ocasioes_cliente` | **NOVO** | CRIAR | Schema do PRD validado |
| 19 | `calendario_producao` | **NOVO** | CRIAR | Schema do PRD validado com ajustes |
| 20 | `pagamentos` | **NOVO** | CRIAR | Schema do PRD validado |
| 21 | `indicacoes` | **NOVO** | CRIAR | Schema do PRD validado |
| 22 | `checklist_tasks` + `completions` | Nelma 029 | ADAPTAR | Adaptar tarefas para confeitaria |

### 2.2 Ajustes ao Schema do PRD

#### 2.2.1 `clientes` — Tabela Unificada (baseada em Nelma `leads` + Elsa `contacts`)

```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  whatsapp_id TEXT,
  email TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT DEFAULT 'Luanda',

  -- Pipeline confeitaria
  estagio TEXT DEFAULT 'novo' CHECK (estagio IN (
    'novo', 'contactado', 'orcamento', 'activo', 'vip', 'inactivo'
  )),

  -- Origem
  origem TEXT DEFAULT 'whatsapp' CHECK (origem IN (
    'instagram', 'tiktok', 'whatsapp', 'indicacao', 'outro'
  )),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Metricas
  total_pedidos INTEGER DEFAULT 0,
  total_gasto NUMERIC(12,2) DEFAULT 0,
  ticket_medio NUMERIC(12,2) DEFAULT 0,
  ultima_compra TIMESTAMPTZ,
  ultimo_contacto TIMESTAMPTZ,

  -- Metadata
  etiquetas TEXT[] DEFAULT '{}',
  notas TEXT,
  criado_por_bot BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT clientes_telefone_unique UNIQUE (telefone)
);

CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_whatsapp_id ON clientes(whatsapp_id) WHERE whatsapp_id IS NOT NULL;
CREATE INDEX idx_clientes_estagio ON clientes(estagio);
CREATE INDEX idx_clientes_origem ON clientes(origem);
CREATE INDEX idx_clientes_ultima_compra ON clientes(ultima_compra DESC);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read clientes" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clientes" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update clientes" ON clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete clientes" ON clientes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Service role all clientes" ON clientes FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**Diferencas vs PRD:** Adicionei `cidade`, `bairro`, estagios simplificados para confeitaria (nao precisa de pipeline complexo como Nelma), `total_pedidos`, `ticket_medio` como campos calculados, e constraint UNIQUE no telefone.

#### 2.2.2 `mensagens_whatsapp` — Usar schema Elsa (mais robusto)

```sql
CREATE TABLE mensagens_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('cliente', 'bot', 'humano', 'sistema')),
  conteudo TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing', 'internal')),
  message_status TEXT DEFAULT 'sent' CHECK (message_status IN ('sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id TEXT,
  media_url TEXT,
  media_type TEXT, -- image, audio, video, document, sticker, location
  intencao_classificada TEXT,
  confianca_classificacao NUMERIC(3,2),
  llm_model TEXT,
  llm_tokens_input INTEGER,
  llm_tokens_output INTEGER,
  llm_latencia_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_msgs_whatsapp_id ON mensagens_whatsapp(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX idx_msgs_cliente ON mensagens_whatsapp(cliente_id);
CREATE INDEX idx_msgs_created ON mensagens_whatsapp(created_at DESC);
CREATE INDEX idx_msgs_direction ON mensagens_whatsapp(direction) WHERE direction = 'incoming';
```

**Decisao:** Combinar o melhor da Nelma (campos LLM) com o melhor da Elsa (media + direction + status). O `sender_type` usa nomenclatura portuguesa (`cliente`, `bot`, `humano`, `sistema`).

#### 2.2.3 `pedidos` — Ajustes

```sql
-- Ajuste: adicionar campos de tracking temporal
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS
  confirmado_at TIMESTAMPTZ,
  pago_at TIMESTAMPTZ,
  producao_inicio_at TIMESTAMPTZ,
  pronto_at TIMESTAMPTZ,
  entregue_at TIMESTAMPTZ;
```

**Razao:** Tracking temporal por estado permite calcular metricas como "tempo medio de producao", "tempo entre confirmacao e pagamento", etc.

#### 2.2.4 `calendario_producao` — Ajuste para granularidade

```sql
-- Ajuste: remover pedidos_agendados (calcular via query) para evitar desincronizacao
-- Em vez de manter contador, calcular dinamicamente:
CREATE OR REPLACE VIEW v_calendario_producao AS
SELECT
  cp.data,
  cp.capacidade_maxima,
  cp.bloqueado,
  cp.notas,
  COUNT(p.id) AS pedidos_agendados,
  cp.capacidade_maxima - COUNT(p.id) AS vagas_disponiveis,
  CASE
    WHEN cp.bloqueado THEN 'bloqueado'
    WHEN COUNT(p.id) >= cp.capacidade_maxima THEN 'lotado'
    WHEN COUNT(p.id) >= cp.capacidade_maxima - 1 THEN 'quase_lotado'
    ELSE 'disponivel'
  END AS status
FROM calendario_producao cp
LEFT JOIN pedidos p ON p.data_entrega = cp.data
  AND p.estado NOT IN ('cancelado')
GROUP BY cp.data, cp.capacidade_maxima, cp.bloqueado, cp.notas;
```

**Razao:** Evita desincronizacao entre o contador e os pedidos reais. A view calcula sempre em tempo real.

---

## 3. Estrategia pgvector — Similarity Search Visual

### 3.1 Porque pgvector

pgvector e a extensao PostgreSQL para busca por similaridade vectorial. Permite armazenar embeddings e fazer queries como "encontra os 3 bolos mais parecidos com esta descricao/imagem".

### 3.2 Pipeline de Embedding

```
FOTO DO PORTFOLIO (upload pela Isi)
        │
        ▼
[1] Guardar em Supabase Storage
        │
        ▼
[2] Claude Sonnet Vision → Descricao textual
    "Bolo de 2 andares com tema Frozen, cobertura chantilly azul,
     flocos de neve em fondant, boneca Elsa no topo, complexidade 4/5"
        │
        ▼
[3] Gerar embedding da descricao via API
    Opcoes:
    a) Supabase AI (pg_embedding + gte-small) — gratis, 384 dims
    b) OpenAI text-embedding-3-small — $0.02/1M tokens, 1536 dims
    c) Voyage AI voyage-3-lite — $0.02/1M tokens, 512 dims
        │
        ▼
[4] INSERT INTO referencias_visuais (..., embedding)
```

### 3.3 Decisao: Modelo de Embedding

| Modelo | Dimensoes | Custo | Qualidade | Recomendacao |
|--------|-----------|-------|-----------|--------------|
| `gte-small` (Supabase AI) | 384 | Gratis | Boa para textos curtos | **MVP** |
| `text-embedding-3-small` (OpenAI) | 1536 | $0.02/1M tokens | Muito boa | Fase 2 |
| `voyage-3-lite` (Voyage) | 512 | $0.02/1M tokens | Excelente | Fase 2 |

**Decisao para MVP:** Usar `gte-small` via Supabase AI (gratis, sem dependencia externa). O portfolio tem ~30-50 itens — a qualidade do `gte-small` e mais que suficiente para este volume. Se precisar de mais precisao com crescimento do portfolio (200+), migrar para `voyage-3-lite`.

**Schema ajustado:**

```sql
-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Para MVP com gte-small (384 dims)
CREATE TABLE referencias_visuais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos_catalogo(id) ON DELETE SET NULL,
  titulo TEXT,
  descricao_visual TEXT NOT NULL, -- gerada pelo Claude Vision
  tags TEXT[] DEFAULT '{}',
  categoria TEXT,
  url_imagem TEXT NOT NULL,
  thumbnail_url TEXT, -- versao reduzida para envio rapido
  embedding vector(384), -- gte-small (Supabase AI)
  complexidade INTEGER DEFAULT 3 CHECK (complexidade BETWEEN 1 AND 5),
  metadata JSONB DEFAULT '{}', -- cores, tema, elementos detectados
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para similarity search (IVFFlat para pequenos datasets)
CREATE INDEX idx_refs_visuais_embedding ON referencias_visuais
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

CREATE INDEX idx_refs_visuais_categoria ON referencias_visuais(categoria);
```

### 3.4 Fluxo de Similarity Search (runtime)

```
CLIENTE ENVIA FOTO DE REFERENCIA
        │
        ▼
[1] Descarregar media da UAZAPI (media_url)
        │
        ▼
[2] Resize para 1024px max + compressao JPEG 80%
    (Sharp via Deno ou Supabase Image Transformations)
        │
        ▼
[3] Claude Sonnet 4.5 Vision:
    Prompt: "Analisa este bolo. Responde em JSON:
    {
      estilo: string,
      tema: string,
      cores: string[],
      elementos: string[],
      complexidade: 1-5,
      tamanho_estimado: string,
      descricao: string
    }"
        │
        ▼
[4] Gerar embedding da descricao (gte-small / Supabase AI)
        │
        ▼
[5] Similarity search:
    SELECT rv.*, pc.nome, pc.precos_por_tamanho, pc.preco_base
    FROM referencias_visuais rv
    LEFT JOIN produtos_catalogo pc ON pc.id = rv.produto_id
    WHERE rv.embedding IS NOT NULL
    ORDER BY rv.embedding <=> $query_embedding
    LIMIT 3;
        │
        ▼
[6] Calcular orcamento:
    - Base: preco do produto mais similar
    - Ajustar por complexidade detectada vs complexidade do similar
    - Ajustar por tamanho solicitado
    - Verificar disponibilidade em calendario_producao
        │
        ▼
[7] Responder ao cliente:
    - 3 fotos do portfolio (via UAZAPI /send/media)
    - Descricao + preco estimado
    - Disponibilidade para data solicitada
```

### 3.5 Fallbacks

| Cenario | Fallback |
|---------|----------|
| Foto muito escura/desfocada | "Nao consegui ver bem a foto. Pode descrever o bolo?" |
| Nenhum similar no portfolio (distancia > threshold) | "Este e um design personalizado! Vou precisar de mais detalhes..." |
| Claude Vision timeout | Retry 1x, depois fallback textual |
| Embedding service indisponivel | Guardar descricao, gerar embedding em background |

---

## 4. Edge Functions — Plano Completo

### 4.1 Inventario de Edge Functions

| # | Funcao | Origem | Accao |
|---|--------|--------|-------|
| 1 | `uazapi-webhook-receiver` | Elsa | ADAPTAR: `contacts` -> `clientes`, adicionar deteccao de imagem para Vision |
| 2 | `uazapi-send-message` | Elsa | REUTILIZAR directamente |
| 3 | `ai-sales-agent` | Elsa | ADAPTAR: prompt confeitaria, intencoes, tool calling para pedidos/calendario |
| 4 | `process-vision` | **NOVO** | Pipeline Vision completo (seccao 3.4) |
| 5 | `recompra-cron` | **NOVO** | Motor de recompra por ocasiao |

### 4.2 Shared Modules (`_shared/`)

| Modulo | Origem | Adaptacao |
|--------|--------|-----------|
| `cors.ts` | Elsa | Reutilizar |
| `get-integration-key.ts` | Elsa | Reutilizar (inclui `normalizeAngolaPhone`, `normalizeUazapiUrl`) |
| `llm-client.ts` | Elsa | ADAPTAR: garantir suporte Claude Vision (multimodal) |
| `supabase-client.ts` | Elsa | Reutilizar |

### 4.3 Detalhe: `uazapi-webhook-receiver` (adaptacao)

Mudancas vs Elsa:

```diff
- .from("contacts")
+ .from("clientes")

- contact_id
+ cliente_id

- sender_type: "contact"
+ sender_type: "cliente"

+ // NOVO: Detectar imagem para trigger de Vision
+ if (mediaType === "image") {
+   // Fire-and-forget: trigger vision pipeline
+   fetch(`${supabaseUrl}/functions/v1/process-vision`, {
+     method: "POST",
+     headers: { Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
+     body: JSON.stringify({
+       cliente_id: cliente.id,
+       media_url: mediaUrl,
+       message_id: savedMessage.id,
+       caption: mediaCaption,
+     }),
+   }).catch(e => console.warn("Vision trigger failed:", e));
+ }
```

### 4.4 Detalhe: `process-vision` (NOVO)

```typescript
// supabase/functions/process-vision/index.ts

serve(async (req) => {
  const { cliente_id, media_url, message_id, caption } = await req.json();

  // 1. Descarregar imagem
  const imageBuffer = await fetch(media_url).then(r => r.arrayBuffer());

  // 2. Resize + compressao (usar Supabase Image Transformations ou sharp)
  const optimized = await optimizeImage(imageBuffer, { maxWidth: 1024, quality: 80 });

  // 3. Guardar em Supabase Storage
  const storagePath = `vision/${cliente_id}/${Date.now()}.jpg`;
  await supabase.storage.from("portfolio").upload(storagePath, optimized);

  // 4. Claude Vision analysis
  const analysis = await callClaudeVision(optimized, {
    prompt: `Analisa este bolo. Responde em JSON:
    {"estilo":"...","tema":"...","cores":["..."],"elementos":["..."],
     "complexidade":1-5,"tamanho_estimado":"...","descricao":"..."}`
  });

  // 5. Gerar embedding da descricao
  const embedding = await generateEmbedding(analysis.descricao);

  // 6. Similarity search
  const { data: similares } = await supabase.rpc("match_referencias_visuais", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 3,
  });

  // 7. Calcular orcamento estimado
  const orcamento = calcularOrcamento(analysis, similares);

  // 8. Guardar resultado como mensagem do bot
  // (o ai-sales-agent usa este resultado para compor a resposta)
  await supabase.from("ai_agent_logs").insert({
    conversation_id: conversationId,
    cliente_id,
    log_type: "vision_analysis",
    data: { analysis, similares, orcamento, storagePath },
  });

  // 9. Retornar para o agente compor resposta
  return Response.json({ analysis, similares, orcamento });
});
```

**RPC para similarity search:**

```sql
CREATE OR REPLACE FUNCTION match_referencias_visuais(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descricao_visual TEXT,
  url_imagem TEXT,
  thumbnail_url TEXT,
  categoria TEXT,
  complexidade INTEGER,
  similarity FLOAT,
  produto_nome TEXT,
  preco_base NUMERIC,
  precos_por_tamanho JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rv.id,
    rv.titulo,
    rv.descricao_visual,
    rv.url_imagem,
    rv.thumbnail_url,
    rv.categoria,
    rv.complexidade,
    1 - (rv.embedding <=> query_embedding) AS similarity,
    pc.nome AS produto_nome,
    pc.preco_base,
    pc.precos_por_tamanho
  FROM referencias_visuais rv
  LEFT JOIN produtos_catalogo pc ON pc.id = rv.produto_id
  WHERE rv.embedding IS NOT NULL
    AND 1 - (rv.embedding <=> query_embedding) > match_threshold
  ORDER BY rv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.5 Detalhe: `ai-sales-agent` (adaptacao da Elsa)

Mudancas principais:

1. **Intencoes:** 16 intencoes de confeitaria (vs 13 da Nelma)
2. **Tool Calling:** Adicionar tools para:
   - `consultar_catalogo(categoria, tamanho)` — busca em `produtos_catalogo`
   - `verificar_disponibilidade(data)` — consulta `v_calendario_producao`
   - `criar_pedido(cliente_id, produto_id, data_entrega, ...)` — insert em `pedidos`
   - `registar_ocasiao(cliente_id, tipo, data, nome_pessoa)` — insert em `ocasioes_cliente`
   - `enviar_foto_portfolio(referencia_id)` — envia via UAZAPI `/send/media`
3. **LLM:** Claude (Anthropic) em vez de OpenAI — adaptar `llm-client.ts`
4. **Context Gatherer:** Incluir historico de pedidos do cliente e ocasioes registadas

### 4.6 Detalhe: `recompra-cron` (NOVO)

```typescript
// supabase/functions/recompra-cron/index.ts

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Buscar ocasioes nos proximos 25-35 dias
  const { data: ocasioes } = await supabase.rpc("get_upcoming_occasions");

  for (const oc of ocasioes || []) {
    // 2. Buscar ultimo pedido do cliente para esta categoria
    const { data: ultimoPedido } = await supabase
      .from("pedidos")
      .select("*")
      .eq("cliente_id", oc.cliente_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Gerar mensagem personalizada com Claude
    const mensagem = await gerarMensagemRecompra(oc, ultimoPedido);

    // 4. Enviar via UAZAPI
    await sendTextMessage(oc.telefone, mensagem);

    // 5. Registar envio
    await supabase
      .from("ocasioes_cliente")
      .update({ ultimo_lembrete_enviado: new Date().toISOString().split("T")[0] })
      .eq("id", oc.id);

    // 6. Guardar mensagem no historico
    await supabase.from("mensagens_whatsapp").insert({
      cliente_id: oc.cliente_id,
      sender_type: "bot",
      conteudo: mensagem,
      direction: "outgoing",
      message_status: "sent",
    });
  }

  return Response.json({ processed: ocasioes?.length || 0 });
});
```

**RPC para buscar ocasioes:**

```sql
CREATE OR REPLACE FUNCTION get_upcoming_occasions()
RETURNS TABLE (
  id UUID,
  cliente_id UUID,
  cliente_nome TEXT,
  telefone TEXT,
  tipo TEXT,
  nome_pessoa TEXT,
  data_evento TEXT,
  dias_falta INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oc.id,
    oc.cliente_id,
    c.nome AS cliente_nome,
    c.telefone,
    oc.tipo,
    oc.nome_pessoa,
    oc.data_evento,
    -- Calcular dias ate a ocasiao (MM-DD)
    EXTRACT(DAY FROM (
      make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::INT,
        SPLIT_PART(oc.data_evento, '-', 1)::INT,
        SPLIT_PART(oc.data_evento, '-', 2)::INT
      ) - CURRENT_DATE
    ))::INT AS dias_falta
  FROM ocasioes_cliente oc
  JOIN clientes c ON c.id = oc.cliente_id
  WHERE oc.activo = true
    AND (oc.ultimo_lembrete_enviado IS NULL
         OR oc.ultimo_lembrete_enviado < CURRENT_DATE - INTERVAL '300 days')
    AND EXTRACT(DAY FROM (
      make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::INT,
        SPLIT_PART(oc.data_evento, '-', 1)::INT,
        SPLIT_PART(oc.data_evento, '-', 2)::INT
      ) - CURRENT_DATE
    )) BETWEEN 25 AND 35;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Cron Jobs (pg_cron)

```sql
-- Habilitar extensoes
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ========================
-- CRON 1: Processar fila de mensagens IA (cada 10 segundos)
-- Reutilizado da Nelma/Elsa
-- ========================
SELECT cron.schedule(
  'isi-ai-agent-process-queue',
  '10 seconds',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-sales-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action":"process_queue"}'::jsonb
  );
  $$
);

-- ========================
-- CRON 2: Processar cadencias/followups (cada 5 minutos)
-- Reutilizado da Nelma/Elsa
-- ========================
SELECT cron.schedule(
  'isi-ai-agent-process-cadence',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-sales-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action":"process_cadence"}'::jsonb
  );
  $$
);

-- ========================
-- CRON 3: Recovery de mensagens stuck (cada 3 minutos)
-- Reutilizado da Nelma
-- ========================
SELECT cron.schedule(
  'isi-ai-agent-queue-recovery',
  '*/3 * * * *',
  $$
  SELECT process_ai_agent_queue();
  $$
);

-- ========================
-- CRON 4: Motor de recompra por ocasiao (diario as 09:00 WAT)
-- NOVO para Isi
-- ========================
SELECT cron.schedule(
  'isi-recompra-ocasioes',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/recompra-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ========================
-- CRON 5: Actualizar metricas de clientes (diario as 03:00 WAT)
-- NOVO para Isi — recalcula LTV, ticket medio, total pedidos
-- ========================
SELECT cron.schedule(
  'isi-actualizar-metricas-clientes',
  '0 3 * * *',
  $$
  UPDATE clientes c SET
    total_pedidos = COALESCE(s.total, 0),
    total_gasto = COALESCE(s.gasto, 0),
    ticket_medio = CASE WHEN COALESCE(s.total, 0) > 0
                        THEN COALESCE(s.gasto, 0) / s.total
                        ELSE 0 END,
    ultima_compra = s.ultima
  FROM (
    SELECT
      cliente_id,
      COUNT(*) AS total,
      SUM(valor_final) AS gasto,
      MAX(entregue_at) AS ultima
    FROM pedidos
    WHERE estado = 'entregue'
    GROUP BY cliente_id
  ) s
  WHERE c.id = s.cliente_id;
  $$
);

-- ========================
-- CRON 6: Gerar slots de calendario (semanal, domingo as 00:00)
-- NOVO para Isi — garante que existem slots para as proximas 8 semanas
-- ========================
SELECT cron.schedule(
  'isi-gerar-calendario',
  '0 0 * * 0',
  $$
  INSERT INTO calendario_producao (data, capacidade_maxima)
  SELECT
    d::DATE,
    CASE EXTRACT(DOW FROM d)
      WHEN 0 THEN 0  -- Domingo: bloqueado
      ELSE 3          -- Default: 3 bolos/dia
    END
  FROM generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '56 days',
    '1 day'
  ) d
  ON CONFLICT (data) DO NOTHING;

  -- Bloquear domingos
  UPDATE calendario_producao
  SET bloqueado = true
  WHERE EXTRACT(DOW FROM data) = 0
    AND bloqueado = false;
  $$
);
```

---

## 6. Supabase Realtime — Subscricoes

```sql
-- Tabelas com Realtime activo
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_whatsapp;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_agent_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_sales_agents;
```

**Frontend subscriptions:**

| Canal | Evento | Uso no Frontend |
|-------|--------|----------------|
| `mensagens_whatsapp` | INSERT | Nova mensagem no inbox (live) |
| `mensagens_whatsapp` | UPDATE | Status de entrega (sent -> delivered -> read) |
| `ai_agent_conversations` | UPDATE | Mudanca de modo (bot -> humano) |
| `notificacoes` | INSERT | Badge de notificacoes |
| `pedidos` | INSERT, UPDATE | Actualizacao do Kanban |

---

## 7. Supabase Storage — Buckets

| Bucket | Politica | Uso |
|--------|----------|-----|
| `portfolio` | Publico (leitura) | Fotos do catalogo/portfolio da Isi |
| `comprovativos` | Privado (auth required) | Comprovativos de pagamento |
| `vision` | Privado (service_role) | Imagens processadas pelo Claude Vision |
| `media` | Privado (auth required) | Media recebida via WhatsApp |

```sql
-- Bucket portfolio: publico para leitura (bot envia URLs directas)
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);

-- Bucket comprovativos: privado
INSERT INTO storage.buckets (id, name, public) VALUES ('comprovativos', 'comprovativos', false);

-- Bucket vision: privado (apenas service_role)
INSERT INTO storage.buckets (id, name, public) VALUES ('vision', 'vision', false);

-- Bucket media: privado
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', false);
```

---

## 8. Seguranca

### 8.1 RLS (Row-Level Security)

Todas as 22 tabelas tem RLS activo. Padroes:
- **SELECT:** Todos os `authenticated` podem ler
- **INSERT/UPDATE:** Todos os `authenticated` (equipa pequena)
- **DELETE:** Apenas `admin` (protecao contra apagamento acidental)
- **service_role:** Acesso total (Edge Functions)

### 8.2 Autenticacao

- Supabase Auth com JWT
- Login por email/password (Isi + operadora futura)
- 2 roles: `admin` (Isi) e `assistente` (operadora)

### 8.3 UAZAPI Security

- Token guardado em `integration_keys` (nunca exposto ao frontend)
- Webhook protegido com `x-webhook-token`
- Edge Functions acedem via `service_role`

### 8.4 Anthropic API

- Key guardada em `integration_keys` (service=anthropic, key_name=api_key)
- Nunca exposta ao frontend
- Rate limiting via `ai_agent_send_counts`

---

## 9. Performance e Optimizacao

### 9.1 Imagens

| Operacao | Optimizacao |
|----------|-------------|
| Upload portfolio | Resize 1024px max + JPEG 80% + thumbnail 256px |
| Envio para Claude Vision | Max 1024px, JPEG 80% (~100-200KB) |
| Envio de fotos ao cliente | Usar thumbnail primeiro, full size a pedido |
| Storage | Supabase Image Transformations para resize on-the-fly |

### 9.2 Queries

| Query | Optimizacao |
|-------|-------------|
| Similarity search | IVFFlat index com lists=10 (adequado para < 1000 itens) |
| Historico mensagens | Index em `(cliente_id, created_at DESC)` + LIMIT |
| Calendario | View materializada (opcional se performance for problema) |
| Dashboard KPIs | Queries agregadas com filtro temporal indexado |

### 9.3 Frontend (PWA)

- Service Worker para cache de assets e API responses
- Loading progressivo (skeleton screens)
- Imagens lazy-loaded com placeholder blur
- Optimistic UI para envio de mensagens

---

## 10. Mapa de Migracoes SQL

| # | Migration | Conteudo | Dependencias |
|---|-----------|----------|--------------|
| 001 | `001_extensions.sql` | pgvector, pg_cron, pg_net, uuid-ossp | -- |
| 002 | `002_profiles.sql` | Reutilizar Nelma 001 | -- |
| 003 | `003_clientes.sql` | Tabela unificada (seccao 2.2.1) | 002 |
| 004 | `004_interacoes.sql` | Reutilizar Nelma 003 (adaptar FK) | 003 |
| 005 | `005_mudancas_estagio.sql` | Reutilizar Nelma 004 (adaptar FK) | 003 |
| 006 | `006_mensagens_whatsapp.sql` | Schema combinado (seccao 2.2.2) | 003 |
| 007 | `007_integration_keys.sql` | Reutilizar Elsa 002 | -- |
| 008 | `008_ai_agent_core.sql` | ai_sales_agents, ai_agent_conversations, queue, logs, send_counts, followups, cadence | 003, 006, 007 |
| 009 | `009_webhook_idempotency.sql` | webhook_processed_messages | -- |
| 010 | `010_produtos_catalogo.sql` | Tabela nova | -- |
| 011 | `011_referencias_visuais.sql` | Tabela nova + pgvector + RPC match | 001, 010 |
| 012 | `012_pedidos.sql` | Tabela nova + timestamps tracking | 003, 010 |
| 013 | `013_calendario_producao.sql` | Tabela nova + view v_calendario | 012 |
| 014 | `014_ocasioes_cliente.sql` | Tabela nova + RPC get_upcoming | 003 |
| 015 | `015_pagamentos.sql` | Tabela nova | 003, 012 |
| 016 | `016_indicacoes.sql` | Tabela nova | 003, 012 |
| 017 | `017_checklist.sql` | checklist_tasks + completions | -- |
| 018 | `018_templates_whatsapp.sql` | Reutilizar Nelma 005 (adaptar conteudo) | -- |
| 019 | `019_notificacoes.sql` | Reutilizar Nelma 011 (adaptar FK) | 003 |
| 020 | `020_consentimentos.sql` | Reutilizar Nelma 012 | 003 |
| 021 | `021_storage_buckets.sql` | 4 buckets + policies | -- |
| 022 | `022_realtime.sql` | Publicacao Realtime | 006, 008, 012, 019 |
| 023 | `023_cron_jobs.sql` | 6 cron jobs (seccao 5) | 008, 013, 014 |
| 024 | `024_seed_catalogo.sql` | 30 produtos do Anexo A | 010 |
| 025 | `025_seed_agent.sql` | Agente IA configurado para confeitaria | 008 |
| 026 | `026_seed_checklist.sql` | 5 tarefas diarias | 017 |
| 027 | `027_rpcs_triggers.sql` | Triggers updated_at, enqueue, claim, etc. | 003, 006, 008 |

**Total: 27 migrations** organizadas por dependencia.

---

## 11. Handoff

### Para @po (Pax) / @sm (River)
1. Criar epics por dominio (D1-D9) seguindo o roadmap de 5 fases
2. Cada epic mapeia a 1 dominio do PRD
3. Stories devem referenciar migrations e Edge Functions especificas

### Para @dev
1. Comecar pelas migrations 001-009 (fundacao)
2. Depois Edge Functions `uazapi-webhook-receiver` + `ai-sales-agent` (adaptar da Elsa)
3. Frontend: fork da estrutura Elsa (App Router + sidebar + inbox)
4. Ficheiros _shared reutilizaveis directamente

### Ficheiros para copiar da Elsa (ponto de partida)

```
supabase/functions/_shared/cors.ts                    → copiar
supabase/functions/_shared/get-integration-key.ts      → copiar
supabase/functions/_shared/llm-client.ts               → adaptar (Claude em vez de OpenAI)
supabase/functions/_shared/supabase-client.ts           → copiar
supabase/functions/uazapi-webhook-receiver/index.ts     → adaptar (clientes, vision trigger)
supabase/functions/uazapi-send-message/index.ts         → copiar
supabase/functions/ai-sales-agent/                      → adaptar (prompt, intencoes, tools)
src/app/api/webhooks/uazapi/route.ts                    → copiar (da Nelma)
```

---

*-- Aria, arquitetando o futuro*
*Arquitectura v1.0 — Delicias da Isi CRM Inteligente*
*Marca Digital · Abril 2026*
