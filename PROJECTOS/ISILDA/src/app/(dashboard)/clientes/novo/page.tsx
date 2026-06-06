'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { useClientes } from '@/hooks/use-clientes'
import type { ClienteEstagio, OrigemCanal } from '@/types/database'

const ESTAGIOS: { value: ClienteEstagio; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'orcamento', label: 'Orcamento' },
  { value: 'activo', label: 'Activo' },
  { value: 'vip', label: 'VIP' },
  { value: 'inactivo', label: 'Inactivo' },
]

const ORIGENS: { value: OrigemCanal; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referencia', label: 'Referencia' },
  { value: 'outro', label: 'Outro' },
]

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')

  if (!digits) return ''
  if (digits.startsWith('244') && digits.length === 12) return `+${digits}`
  if (digits.length === 9) return `+244${digits}`

  return value.trim()
}

export default function NovoClientePage() {
  const router = useRouter()
  const { criarCliente } = useClientes()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [origem, setOrigem] = useState<OrigemCanal>('whatsapp')
  const [estagio, setEstagio] = useState<ClienteEstagio>('novo')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!nome.trim()) {
      setError('O nome do cliente e obrigatorio.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const telefoneNormalizado = normalizePhone(telefone)

      await criarCliente({
        nome: nome.trim(),
        telefone: telefoneNormalizado || null,
        email: email.trim() || null,
        origem,
        estagio,
        notas: notas.trim() || null,
        criado_por_bot: false,
      })

      router.push('/clientes')
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Falha ao criar o cliente.'
      )
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/clientes"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">
            Novo Cliente
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Regista um cliente manualmente sem depender do WhatsApp.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Nome</span>
            <input
              type="text"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Maria da Silva"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Telefone</span>
            <input
              type="tel"
              value={telefone}
              onChange={(event) => setTelefone(event.target.value)}
              placeholder="923 456 789"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="cliente@email.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Origem</span>
            <select
              value={origem}
              onChange={(event) => setOrigem(event.target.value as OrigemCanal)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
            >
              {ORIGENS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Estagio</span>
            <select
              value={estagio}
              onChange={(event) =>
                setEstagio(event.target.value as ClienteEstagio)
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
            >
              {ESTAGIOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-gray-700">Notas</span>
          <textarea
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Contexto relevante sobre o cliente, preferências ou detalhes de atendimento."
            rows={5}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          <Link
            href="/clientes"
            className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Criar cliente
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
