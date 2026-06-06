'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, Eye, EyeOff, Lock, MessageSquare, Shield, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { WhatsAppInstancesSection } from '@/components/configuracoes/whatsapp-instances-section'
import { buildIntegrationKeysPayload } from '@/lib/configuracoes/integration-keys'

type SettingsTab = 'geral' | 'integracoes' | 'api' | 'whatsapp'

type IntegrationKeyRow = {
  service: string
  key_name: string
  key_value: string
  is_active: boolean
}

type ApiKeyField = {
  service: string
  key_name: string
  label: string
  helper: string
  sensitive?: boolean
  placeholder?: string
}

const API_FIELDS: ApiKeyField[] = [
  {
    service: 'anthropic',
    key_name: 'api_key',
    label: 'Anthropic Claude',
    helper: 'Usada pelos agentes IA e análise multimodal.',
    sensitive: true,
    placeholder: 'sk-ant-...',
  },
  {
    service: 'openai',
    key_name: 'api_key',
    label: 'OpenAI GPT',
    helper: 'Opcional, para cenários de fallback e testes.',
    sensitive: true,
    placeholder: 'sk-...',
  },
  {
    service: 'gemini',
    key_name: 'api_key',
    label: 'Google Gemini',
    helper: 'Opcional, para fluxos alternativos de IA.',
    sensitive: true,
    placeholder: 'AIza...',
  },
  {
    service: 'uazapi',
    key_name: 'base_url',
    label: 'UAZAPI URL',
    helper: 'Endpoint do servidor UAZAPI usado pelo WhatsApp.',
    placeholder: 'https://meuservidor.uazapi.com',
  },
  {
    service: 'uazapi',
    key_name: 'token',
    label: 'UAZAPI Token',
    helper: 'Token de acesso para chamadas da UAZAPI.',
    sensitive: true,
    placeholder: 'admin-token-...',
  },
  {
    service: 'uazapi',
    key_name: 'webhook_token',
    label: 'UAZAPI Webhook Token',
    helper: 'Token usado para validar eventos recebidos.',
    sensitive: true,
    placeholder: 'webhook-token-...',
  },
]

function maskValue(value: string) {
  if (!value) return ''
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

function statusFor(value: string) {
  return value ? 'Configurada' : 'Em falta'
}

export function SettingsPanel() {
  const supabase = useMemo(() => createClient(), [])
  const sharedTenantId = process.env.NEXT_PUBLIC_SHARED_TENANT_ID?.trim() || null
  const [activeTab, setActiveTab] = useState<SettingsTab>('geral')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let activo = true

    async function loadKeys() {
      let query = supabase
        .from('integration_keys')
        .select('service,key_name,key_value,is_active')
        .in('service', ['anthropic', 'openai', 'gemini', 'uazapi'])
        .in('key_name', ['api_key', 'base_url', 'token', 'webhook_token'])

      if (sharedTenantId) {
        query = query.eq('tenant_id', sharedTenantId)
      }

      const { data, error: fetchError } = await query

      if (!activo) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const initial: Record<string, string> = {}
      for (const row of (data ?? []) as IntegrationKeyRow[]) {
        initial[`${row.service}:${row.key_name}`] = row.key_value ?? ''
      }

      setKeys(initial)
      setLoading(false)
    }

    void loadKeys()
    return () => {
      activo = false
    }
  }, [sharedTenantId, supabase])

  const configuredCount = useMemo(
    () => API_FIELDS.filter((field) => Boolean(keys[`${field.service}:${field.key_name}`]?.trim())).length,
    [keys]
  )

  const handleChange = (service: string, keyName: string, value: string) => {
    setKeys((prev) => ({
      ...prev,
      [`${service}:${keyName}`]: value,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const payload = buildIntegrationKeysPayload(API_FIELDS.map((field) => ({
        service: field.service,
        key_name: field.key_name,
        key_value: keys[`${field.service}:${field.key_name}`]?.trim() ?? '',
        is_active: Boolean(keys[`${field.service}:${field.key_name}`]?.trim()),
      })))

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/configuracoes/integration-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ rows: payload }),
      })
      const raw = await res.text()
      let data: { error?: string } = {}
      try {
        data = raw ? (JSON.parse(raw) as { error?: string }) : {}
      } catch {
        data = { error: raw }
      }

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao guardar chaves')
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao guardar chaves')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        {([
          { key: 'geral', label: 'Geral', icon: SlidersHorizontal },
          { key: 'integracoes', label: 'Integrações', icon: Shield },
          { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
          { key: 'api', label: 'Chaves de API', icon: Lock },
        ] as const).map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'geral' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Configurações gerais</h2>
              <p className="mt-1 text-sm text-slate-600">
                Aqui ficam preferências operacionais do sistema. As integrações externas ficam isoladas no separador próprio.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</p>
              <p className="mt-2 text-sm text-slate-700">Ambiente preparado para uso interno da equipa.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Acesso</p>
              <p className="mt-2 text-sm text-slate-700">As chaves de API não aparecem aqui por defeito.</p>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'integracoes' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">Integrações activas</h2>
              <p className="mt-1 text-sm text-slate-600">
                O sistema lê estas integrações do backend. O separador seguinte é só para manutenção das chaves.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {API_FIELDS.map((field) => {
              const value = keys[`${field.service}:${field.key_name}`]?.trim() ?? ''
              return (
                <div key={`${field.service}:${field.key_name}`} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{field.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{field.helper}</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                      value ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    )}>
                      {statusFor(value)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-mono text-slate-500">{field.service}/{field.key_name}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {activeTab === 'whatsapp' && <WhatsAppInstancesSection />}

      {activeTab === 'api' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <Lock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">Chaves de API</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  Separador reservado para manter as integrações fora da vista normal. As chaves ficam mascaradas e só são gravadas no servidor.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500">Configuradas</p>
              <p className="text-lg font-semibold text-slate-900">{configuredCount}/{API_FIELDS.length}</p>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && !error && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              <span>A carregar as chaves guardadas no backend...</span>
            </div>
          )}

          <div className="mt-6 grid gap-4">
            {API_FIELDS.map((field) => {
              const fieldKey = `${field.service}:${field.key_name}`
              const currentValue = keys[fieldKey] ?? ''
              const isVisible = visible[fieldKey] ?? false

              return (
                <label key={fieldKey} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{field.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{field.helper}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVisible((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {isVisible ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {field.service}/{field.key_name}
                      </p>
                      <input
                        type={field.sensitive && !isVisible ? 'password' : 'text'}
                        value={currentValue}
                        onChange={(event) => handleChange(field.service, field.key_name, event.target.value)}
                        placeholder={field.placeholder}
                        className="mt-2 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>

                    <div className="text-xs text-slate-500">
                      {currentValue ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {maskValue(currentValue)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-500">
                          Em branco
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">
              Se guardares, o backend passa a usar estas chaves nas funções e diagnósticos.
            </p>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'A guardar...' : loading ? 'A carregar...' : 'Guardar chaves'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
