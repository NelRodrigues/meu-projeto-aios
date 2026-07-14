'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Loader2, MessageSquare, Plus, QrCode, RefreshCw, Smartphone, Trash2, WifiOff, X } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type WhatsAppInstance = {
  id: string
  name: string
  phone_number: string | null
  teams: string[] | null
  status: string
  api_key: string | null
  api_url: string | null
  webhook_url: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type ListResponse = {
  instances?: WhatsAppInstance[]
  error?: string
}

type InstanceActionResponse = {
  instance?: WhatsAppInstance
  qrcode?: string | null
  liveStatus?: {
    status?: { connected?: boolean }
    instance?: { qrcode?: string; profileName?: string }
  } | null
  error?: string
}

function formatPhone(phone: string | null) {
  if (!phone) return 'Sem número'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('244')) {
    return `+244 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }
  return phone
}

function statusStyle(status: string) {
  switch (status) {
    case 'connected':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'connecting':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'error':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

function isImageQr(value: string) {
  return /^https?:\/\//i.test(value) || /^data:image\//i.test(value)
}

export function WhatsAppInstancesSection() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('Delícias da Isi')
  const [createOpen, setCreateOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrName, setQrName] = useState('')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrText, setQrText] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [statusTicker, setStatusTicker] = useState(0)

  async function loadInstances() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/whatsapp/instances')
      const data = (await res.json()) as ListResponse

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao carregar instâncias WhatsApp')
      }

      setInstances(data.instances ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar instâncias WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInstances()
  }, [])

  useEffect(() => {
    if (!selectedId || !qrOpen) return

    const interval = setInterval(() => {
      setStatusTicker((value) => value + 1)
    }, 3500)

    return () => clearInterval(interval)
  }, [selectedId, qrOpen])

  useEffect(() => {
    if (!selectedId || !qrOpen) return

    let cancelled = false

    async function refreshStatus() {
      try {
        const res = await fetch(`/api/whatsapp/instances/${selectedId}`)
        const data = (await res.json()) as InstanceActionResponse

        if (cancelled || !res.ok) return

        if (data.instance) {
          setInstances((prev) => prev.map((item) => (item.id === data.instance?.id ? data.instance! : item)))
        }

        const live = data.liveStatus?.status?.connected
        const liveQr = data.liveStatus?.instance?.qrcode || data.qrcode || null
        if (live) {
          setQrCode(null)
          setQrText(null)
          setQrOpen(false)
          await loadInstances()
          return
        }

        if (liveQr) {
          if (isImageQr(liveQr)) {
            setQrCode(liveQr)
            setQrText(null)
          } else {
            setQrCode(null)
            setQrText(liveQr)
          }
        }
      } catch {
        // polling silencioso
      }
    }

    void refreshStatus()
    return () => {
      cancelled = true
    }
  }, [selectedId, qrOpen, statusTicker])

  const createInstance = async () => {
    const name = newName.trim()
    if (!name) {
      setError('Indica um nome para a instância')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/whatsapp/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = (await res.json()) as InstanceActionResponse

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao criar instância')
      }

      if (data.instance) {
        setInstances((prev) => [data.instance!, ...prev.filter((item) => item.id !== data.instance!.id)])
        setSelectedId(data.instance.id)
        setQrName(data.instance.name)
      }

      if (data.qrcode) {
        if (isImageQr(data.qrcode)) {
          setQrCode(data.qrcode)
          setQrText(null)
        } else {
          setQrCode(null)
          setQrText(data.qrcode)
        }
        setQrOpen(true)
      }

      setCreateOpen(false)
      setNewName('Delícias da Isi')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Falha ao criar instância')
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (id: string, action: 'status' | 'connect' | 'disconnect' | 'delete') => {
    setBusyId(id)
    setError(null)

    try {
      const res = await fetch(`/api/whatsapp/instances/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = (await res.json()) as InstanceActionResponse

      if (!res.ok) {
        throw new Error(data.error || 'Falha na acção da instância')
      }

      if (data.instance) {
        setInstances((prev) => prev.map((item) => (item.id === data.instance?.id ? data.instance! : item)))
      }

      if (action === 'connect') {
        setSelectedId(id)
        setQrName(instances.find((item) => item.id === id)?.name || 'WhatsApp')
        const liveQr = data.qrcode || data.liveStatus?.instance?.qrcode || null
        if (liveQr && isImageQr(liveQr)) {
          setQrCode(liveQr)
          setQrText(null)
        } else {
          setQrCode(null)
          setQrText(liveQr)
        }
        setQrOpen(Boolean(liveQr))
      }

      if (action === 'delete') {
        setInstances((prev) => prev.filter((item) => item.id !== id))
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Falha na acção da instância')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">WhatsApp UAZAPI</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Cria a instância, recebe o QR Code e liga o número da Delícias da Isi ao agente Soraya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void loadInstances()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova instância
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {[0, 1].map((index) => (
              <div key={index} className="h-48 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : instances.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <Smartphone className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-900">Nenhuma instância criada</p>
            <p className="mt-1 text-sm text-slate-600">Cria a primeira instância para gerar o QR Code e ligar o WhatsApp.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {instances.map((instance) => (
              <div key={instance.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-900">{instance.name}</h3>
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', statusStyle(instance.status))}>
                          {instance.status === 'connected' ? 'Conectado' : instance.status === 'connecting' ? 'A ligar' : instance.status === 'error' ? 'Erro' : 'Desconectado'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{formatPhone(instance.phone_number)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => void runAction(instance.id, 'status')} disabled={busyId === instance.id}>
                        {busyId === instance.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void runAction(instance.id, 'connect')} disabled={busyId === instance.id}>
                        <QrCode className="mr-2 h-4 w-4" />
                        QR
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-medium text-slate-500">API</span>
                      <div className="mt-1 truncate font-mono">{instance.api_url || 'Sem URL'}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-medium text-slate-500">Webhook</span>
                      <div className="mt-1 truncate font-mono">{instance.webhook_url || 'Sem webhook'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void runAction(instance.id, 'disconnect')}
                      disabled={busyId === instance.id}
                      className="gap-2"
                    >
                      <WifiOff className="h-4 w-4" />
                      Desconectar
                    </Button>
                    <Button
                      variant="ghost"
                      className="gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => void runAction(instance.id, 'delete')}
                      disabled={busyId === instance.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Nova instância WhatsApp</h3>
                <p className="mt-1 text-sm text-slate-600">
                  O nome da instância fica visível na UAZAPI e no painel. Depois da criação, o QR Code aparece para escanear no telefone.
                </p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <label htmlFor="whatsapp-instance-name" className="text-sm font-medium text-slate-900">
                Nome da instância
              </label>
              <input
                id="whatsapp-instance-name"
                value={newName}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNewName(event.target.value)}
                placeholder="Delícias da Isi"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-rose-400 focus:bg-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void createInstance()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A criar...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar e gerar QR
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">QR Code - {qrName}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Abre o WhatsApp no telemóvel, entra em Dispositivos ligados e escaneia este QR Code.
                </p>
              </div>
              <button type="button" onClick={() => setQrOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              {qrCode ? (
                <Image
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  width={256}
                  height={256}
                  unoptimized
                  className="mx-auto h-64 w-64 rounded-xl bg-white p-2"
                />
              ) : qrText ? (
                <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4">
                  <div className="space-y-3">
                    <QrCode className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Código de pareamento</p>
                    <p className="break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800">
                      {qrText}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}
              <p className="mt-3 text-sm text-slate-600">
                A instância é actualizada automaticamente quando o WhatsApp ficar ligado.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => void (selectedId ? runAction(selectedId, 'status') : undefined)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar estado
              </Button>
              <Button onClick={() => setQrOpen(false)} className="gap-2">
                <X className="h-4 w-4" />
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
