function getSharedTenantId(): string | undefined {
  return (
    Deno.env.get("NEXT_PUBLIC_SHARED_TENANT_ID")?.trim() ||
    Deno.env.get("SHARED_TENANT_ID")?.trim() ||
    Deno.env.get("SUPABASE_SHARED_TENANT_ID")?.trim() ||
    undefined
  );
}

export function isSharedBackendModeRuntime(): boolean {
  return Boolean(getSharedTenantId());
}

export function getSharedTenantIdRuntime(): string | undefined {
  return getSharedTenantId();
}
