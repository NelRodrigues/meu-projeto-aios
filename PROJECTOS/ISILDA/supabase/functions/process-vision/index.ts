import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";
import { isSharedBackendModeRuntime } from "../_shared/backend-mode.ts";
import { callVision, generateEmbedding } from "../_shared/llm-client.ts";
import { downloadImageAsBase64, saveImageToStorage } from "./image-utils.ts";
import { calcularOrcamento, type SimilarProduto } from "./pricing.ts";

const VISION_PROMPT = `Analisa este bolo/doce artesanal fotografado. Responde APENAS em JSON valido sem markdown:
{"estilo":"chantilly|bento_cake|naked|vintage|especial|doces|outro","tema":"tema decorativo (ex: Frozen, Floresta, Minimalista)","cores":["cor1","cor2"],"elementos":["elemento1","elemento2"],"complexidade":1,"tamanho_estimado":"pequeno|medio|grande|muito grande","descricao":"descricao detalhada em 1-2 frases"}

Complexidade: 1=simples, 2=basico, 3=moderado, 4=elaborado, 5=muito complexo`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const sharedMode = isSharedBackendModeRuntime();

    const { cliente_id, media_url, message_id, caption } = await req.json();

    if (!cliente_id || !media_url) {
      return new Response(
        JSON.stringify({ error: "cliente_id e media_url sao obrigatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Obter API key Anthropic
    const apiKey = await getIntegrationKeyWithClient(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY nao configurada");
    }

    // 2. Obter token UAZAPI para download de media (se necessario)
    const uazapiToken = await getIntegrationKeyWithClient(supabase, "uazapi", "token", "UAZAPI_TOKEN");

    // 3. Descarregar imagem
    console.log("[vision] Downloading image:", media_url);
    let imageData;
    try {
      imageData = await downloadImageAsBase64(media_url, uazapiToken ?? undefined);
    } catch (err) {
      console.error("[vision] Failed to download image:", err);
      return new Response(
        JSON.stringify({ error: "image_download_failed", message: String(err) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Guardar em Storage (nao fatal se falhar)
    const storagePath = await saveImageToStorage(supabase, imageData, cliente_id);

    // 5. Chamar Claude Vision
    console.log("[vision] Calling Claude Vision...");
    let analysis;
    try {
      const visionResult = await callVision(
        imageData.base64,
        imageData.mediaType,
        VISION_PROMPT,
        apiKey
      );

      // Parse JSON da resposta
      const jsonMatch = visionResult.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in vision response");

      analysis = JSON.parse(jsonMatch[0]);
      analysis._tokens_input = visionResult.tokens_input;
      analysis._tokens_output = visionResult.tokens_output;
      analysis._latency_ms = visionResult.latency_ms;
    } catch (err) {
      console.error("[vision] Vision analysis failed:", err);
      return new Response(
        JSON.stringify({
          error: "image_unclear",
          message: "Nao foi possivel analisar a imagem",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[vision] Analysis:", JSON.stringify(analysis));

    // 6. Gerar embedding da descricao
    const descricao = analysis.descricao || `${analysis.estilo} ${analysis.tema}`;
    let embedding: number[] = [];
    try {
      embedding = await generateEmbedding(descricao, supabaseUrl, supabaseKey);
    } catch (err) {
      console.warn("[vision] Embedding generation failed (non-fatal):", err);
    }

    // 7. Similarity search (apenas se embedding disponivel e nao zero)
    let similares: SimilarProduto[] = [];
    const isValidEmbedding = embedding.length === 384 && embedding.some((v) => v !== 0);

    if (isValidEmbedding) {
      try {
        const { data: matches } = await supabase.rpc("match_referencias_visuais", {
          query_embedding: embedding,
          match_threshold: 0.3,
          match_count: 3,
        });
        similares = matches ?? [];
      } catch (err) {
        console.warn("[vision] Similarity search failed (non-fatal):", err);
      }
    }

    console.log("[vision] Similares encontrados:", similares.length);

    // 8. Calcular orcamento
    const orcamento = calcularOrcamento(analysis, similares);

    // 9. Guardar log
    await supabase.from("ai_agent_logs").insert(
      sharedMode
        ? {
            contact_id: cliente_id,
            log_type: "vision_analysis",
            data: {
              media_url,
              message_id,
              caption,
              storage_path: storagePath,
              analysis: { ...analysis, _tokens_input: undefined, _tokens_output: undefined, _latency_ms: undefined },
              similares_count: similares.length,
              orcamento,
            },
            tokens_input: analysis._tokens_input || 0,
            tokens_output: analysis._tokens_output || 0,
          }
        : {
            cliente_id,
            log_type: "vision_analysis",
            data: {
              media_url,
              message_id,
              caption,
              storage_path: storagePath,
              analysis: { ...analysis, _tokens_input: undefined, _tokens_output: undefined, _latency_ms: undefined },
              similares_count: similares.length,
              orcamento,
            },
            tokens_input: analysis._tokens_input || 0,
            tokens_output: analysis._tokens_output || 0,
          }
    );

    // 10. Resposta
    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        similares,
        orcamento,
        storage_path: storagePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[vision] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
