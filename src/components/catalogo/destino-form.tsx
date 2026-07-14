'use client'

import { useState } from 'react'
import { Modal, inputClass, labelClass, FieldError } from './modal'
import { validateDestino } from '@/lib/catalogo-validation'
import type { Destino } from '@/types/database'

interface Props {
  parceiroId: string
  destino?: Destino | null
  onClose: () => void
  onSubmit: (data: Partial<Destino>) => Promise<void>
}

// Formulário criar/editar destino (story 2.2). Valida moeda ISO (3 maiúsculas).
export function DestinoForm({ parceiroId, destino, onClose, onSubmit }: Props) {
  const [pais, setPais] = useState(destino?.pais ?? '')
  const [cidade, setCidade] = useState(destino?.cidade ?? '')
  const [faixa, setFaixa] = useState(destino?.custo_vida_faixa ?? '')
  const [moeda, setMoeda] = useState(destino?.custo_vida_currency ?? '')
  const [notas, setNotas] = useState(destino?.notas ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const moedaNorm = moeda.trim().toUpperCase()
    const val = validateDestino({ pais, custo_vida_currency: moedaNorm || null })
    setErrors(val)
    if (Object.keys(val).length > 0) return

    setSaving(true)
    try {
      await onSubmit({
        parceiro_id: parceiroId,
        pais: pais.trim(),
        cidade: cidade.trim() || null,
        custo_vida_faixa: faixa.trim() || null,
        custo_vida_currency: moedaNorm || null,
        notas: notas.trim() || null,
      })
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={destino ? 'Editar destino' : 'Novo destino'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass}>País *</label>
          <input className={inputClass} value={pais} onChange={e => setPais(e.target.value)} />
          <FieldError message={errors.pais} />
        </div>
        <div>
          <label className={labelClass}>Cidade</label>
          <input className={inputClass} value={cidade} onChange={e => setCidade(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Custo de vida (faixa)</label>
            <input
              className={inputClass}
              value={faixa}
              onChange={e => setFaixa(e.target.value)}
              placeholder="ex.: 600-1200"
            />
          </div>
          <div>
            <label className={labelClass}>Moeda (3 letras)</label>
            <input
              className={inputClass}
              value={moeda}
              maxLength={3}
              onChange={e => setMoeda(e.target.value.toUpperCase())}
              placeholder="EUR"
            />
            <FieldError message={errors.custo_vida_currency} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notas</label>
          <textarea
            className={inputClass}
            rows={2}
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />
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
