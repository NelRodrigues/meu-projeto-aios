export type IntegrationKeyInput = {
  service: string
  key_name: string
  key_value: string
  is_active: boolean
}

export function buildIntegrationKeysPayload(rows: IntegrationKeyInput[]) {
  return rows
    .filter((row) => Boolean(row.service?.trim() && row.key_name?.trim()))
    .map((row) => ({
      service: row.service.trim(),
      key_name: row.key_name.trim(),
      key_value: String(row.key_value ?? '').trim(),
      is_active: Boolean(row.is_active),
    }))
}
