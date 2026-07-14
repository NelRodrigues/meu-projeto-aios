'use client'

import { useState } from 'react'
import { Modal, inputClass, labelClass, FieldError } from '@/components/catalogo/modal'
import { validateFactura } from '@/lib/financeiro-validation'
import type { Factura } from '@/types/database'

// Registo financeiro "leve" para pré-preencher valor/moeda/lead da factura.
export interface FinanceiroOption {
  id: string
  valor: number
  currency: string
  lead_id: string | null
  parceiro_nome: string | null
  tipo: string
}

interface Props {
  factura?: Factura | null
  registos: FinanceiroOption[]
  onClose: () => void
  onSubmit: (data: Partial<Factura>) => Promise<void>
}

// Formulário criar/editar factura (story 2.6). Ao escolher o registo financeiro,
// pré-preenche valor/moeda/lead a partir dele (a factura factura um registo).
export function FacturaForm({ factura, registos, onClose, onSubmit }: Props) {
  const [financeiroId, setFinanceiroId] = useState(factura?.financeiro_id ?? '')
  const [numero, setNumero] = useState(factura?.numero ?? '')
  const [valor, setValor] = useState(factura?.valor != null ? String(factura.valor) : '')
  const [moeda, setMoeda] = useState(factura?.currency ?? '')
  const [vencimento, setVencimento] = useState(factura?.vencimento ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Ao escolher o registo financeiro, herda valor/moeda se ainda vazios.
  function aoEscolherFinanceiro(id: string) {
    setFinanceiroId(id)
    const reg = registos.find(r => r.id === id)
    if (!reg) return
    if (!valor.trim()) setValor(String(reg.valor))
    if (!moeda.trim()) setMoeda(reg.currency)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const moedaNorm = moeda.trim().toUpperCase()
    const valorNum = valor.trim() ? Number(valor) : null

    const val = validateFactura({
      valor: valorNum,
      currency: moedaNorm || null,
      vencimento: vencimento || null,
    })
    setErrors(val)
    if (Object.keys(val).length > 0) return

    const reg = registos.find(r => r.id === financeiroId)

    setSaving(true)
    try {
      await onSubmit({
        financeiro_id: financeiroId || null,
        lead_id: reg?.lead_id ?? factura?.lead_id ?? null,
        numero: numero.trim() || null,
        valor: valorNum as number,
        currency: moedaNorm,
        vencimento,
      })
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={factura ? 'Editar factura' : 'Nova factura'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass}>Registo financeiro</label>
          <select
            className={inputClass}
            value={financeiroId}
            onChange={e => aoEscolherFinanceiro(e.target.value)}
          >
            <option value="">— sem registo associado —</option>
            {registos.map(r => (
              <option key={r.id} value={r.id}>
                {r.tipo === 'comissao' ? 'Comissão' : 'Honorário'} · {r.valor} {r.currency}
                {r.parceiro_nome ? ` · ${r.parceiro_nome}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Número da factura</label>
          <input className={inputClass} value={numero} onChange={e => setNumero(e.target.value)} placeholder="ex.: FT 2026/014" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Valor *</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
            />
            <FieldError message={errors.valor} />
          </div>
          <div>
            <label className={labelClass}>Moeda *</label>
            <input
              className={inputClass}
              value={moeda}
              maxLength={3}
              onChange={e => setMoeda(e.target.value.toUpperCase())}
              placeholder="EUR"
            />
            <FieldError message={errors.currency} />
          </div>
          <div>
            <label className={labelClass}>Vencimento *</label>
            <input
              className={inputClass}
              type="date"
              value={vencimento}
              onChange={e => setVencimento(e.target.value)}
            />
            <FieldError message={errors.vencimento} />
          </div>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
