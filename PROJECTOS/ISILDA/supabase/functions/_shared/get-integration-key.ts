import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getIntegrationKey(
  service: string,
  keyName: string,
  envFallback?: string
): Promise<string | undefined> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return envFallback ? Deno.env.get(envFallback) : undefined;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data } = await supabase
      .from("integration_keys")
      .select("key_value")
      .eq("service", service)
      .eq("key_name", keyName)
      .eq("is_active", true)
      .maybeSingle();

    if (data?.key_value) {
      return data.key_value;
    }
  } catch (e) {
    console.warn(`Failed to fetch integration key ${service}/${keyName} from DB:`, e);
  }

  return envFallback ? Deno.env.get(envFallback) : undefined;
}

export async function getIntegrationKeyWithClient(
  supabase: SupabaseClient,
  service: string,
  keyName: string,
  envFallback?: string
): Promise<string | undefined> {
  try {
    const { data } = await supabase
      .from("integration_keys")
      .select("key_value")
      .eq("service", service)
      .eq("key_name", keyName)
      .eq("is_active", true)
      .maybeSingle();

    if (data?.key_value) {
      return data.key_value;
    }
  } catch (e) {
    console.warn(`Failed to fetch integration key ${service}/${keyName} from DB:`, e);
  }

  return envFallback ? Deno.env.get(envFallback) : undefined;
}

export function normalizeUazapiUrl(input: string): string {
  const val = input.trim();
  if (val.startsWith("http://") || val.startsWith("https://")) {
    return val.replace(/\/+$/, "");
  }
  if (val.includes(".uazapi.com")) {
    return `https://${val.replace(/\/+$/, "")}`;
  }
  return `https://${val}.uazapi.com`;
}

export function normalizeAngolaPhone(input: string): string {
  const digits = input
    .replace(/@s\.whatsapp\.net/g, "")
    .replace(/@c\.us/g, "")
    .replace(/@lid/g, "")
    .replace(/\D/g, "");

  if (digits.startsWith("244") && digits.length === 12) {
    return digits;
  }

  if (digits.length === 9 && digits.startsWith("9")) {
    return "244" + digits;
  }

  if (digits.startsWith("244") && digits.length > 12) {
    const local = digits.slice(3);
    if (local.length === 9 && local.startsWith("9")) {
      return "244" + local;
    }
  }

  if (digits.length <= 9) {
    return "244" + digits;
  }

  return digits;
}
