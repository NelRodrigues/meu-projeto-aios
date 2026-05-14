// Helper para ler chaves de integração da tabela `config` (preenchidas pelo
// admin em /configuracoes > Integrações > API Keys). Cai em Deno.env como
// fallback (útil pra dev local). NUNCA hardcode valores.
//
// Uso:
//   import { getIntegrationKey } from "../_shared/config.ts";
//   const anthropicKey = await getIntegrationKey(supabase, "ANTHROPIC_API_KEY");

import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Cache em memória (por processo) pra evitar query a cada chamada da função.
// TTL curto pra refletir mudanças do admin sem reiniciar a função.
const TTL_MS = 60_000; // 60 segundos
const cache = new Map<string, { value: string | null; expiresAt: number }>();

export async function getIntegrationKey(
  supabase: SupabaseClient,
  key: string,
  tenantSlug?: string
): Promise<string | null> {
  const cacheKey = tenantSlug ? `${tenantSlug}:${key}` : key;

  // 1. Cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // 2. Tabela integration_keys (tenant-specific, SIC Geral multi-tenant)
  if (tenantSlug) {
    try {
      const { data } = await supabase.rpc("get_tenant_key", {
        p_tenant_slug: tenantSlug,
        p_service: key.split("_")[0]?.toLowerCase() || "general",
        p_key_name: key,
      });
      if (data && String(data).trim().length > 0) {
        const value = String(data).trim();
        cache.set(cacheKey, { value, expiresAt: Date.now() + TTL_MS });
        return value;
      }
    } catch {
      // Fallback to config table
    }
  }

  // 3. Tabela config (fonte primaria — admin preenche pela UI do CRM)
  try {
    const { data } = await supabase
      .from("config")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (data?.value && String(data.value).trim().length > 0) {
      const value = String(data.value).trim();
      cache.set(cacheKey, { value, expiresAt: Date.now() + TTL_MS });
      return value;
    }
  } catch (err) {
    console.warn(`[getIntegrationKey] Erro lendo config.${key}:`, err);
  }

  // 4. Env var (fallback pra dev/deploy manual)
  const envValue = Deno.env.get(key);
  if (envValue && envValue.trim().length > 0) {
    const value = envValue.trim();
    cache.set(cacheKey, { value, expiresAt: Date.now() + TTL_MS });
    return value;
  }

  // Não encontrado
  cache.set(cacheKey, { value: null, expiresAt: Date.now() + TTL_MS });
  return null;
}

// Invalida o cache para uma chave específica (ou todas se omitido).
// Útil quando o admin atualiza a chave e não quer esperar o TTL.
export function invalidateIntegrationKeyCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

// Helper que exige a chave (lança erro se não tiver) — usar quando a função
// não consegue operar sem ela.
export async function requireIntegrationKey(
  supabase: SupabaseClient,
  key: string
): Promise<string> {
  const value = await getIntegrationKey(supabase, key);
  if (!value) {
    throw new Error(
      `Integração "${key}" não configurada. Peça ao administrador ` +
      `preencher em /configuracoes > Integrações > API Keys.`
    );
  }
  return value;
}
