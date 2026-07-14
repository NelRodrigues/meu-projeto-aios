'use client'

import { useState } from 'react'
import { Modal, inputClass, labelClass, FieldError } from './modal'
import { validatePrograma } from '@/lib/catalogo-validation'
import type { Programa, ProgramaTipo } from '@/types/database'

const TIPOS: { value: ProgramaTipo; label: string }[] = [
  { value: 'summer_camp', label: 'Summer camp' },
  { value: 'linguas', label: 'Línguas' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'licenciatura', label: 'Licenciatura' },
  { value: 'mestrado', label: 'Mestrado' },
  { value: 'voluntariado', label: 'Voluntariado' },
  { value: 'outro', label: 'Outro' },
]

interface Props {
  destinoId: string
  programa?: Programa | null
  onClose: () => void
  onSubmit: (data: Partial<Programa>) => Promise<void>
}

// Formulário criar/editar programa (story 2.2). Valida moeda + min<=max.
export function ProgramaForm({ destinoId, programa, onClose, onSubmit }: Props) {
  const [nome, setNome] = useState(programa?.nome ?? '')
  const [tipo, setTipo] = useState<ProgramaTipo>(programa?.tipo ?? 'outro')
  const [custoMin, setCustoMin] = useState(programa?.custo_min != null ? String(programa.custo_min) : '')
  const [custoMax, setCustoMax] = useState(programa?.custo_max != null ? String(programa.custo_max) : '')
  const [moeda, setMoeda] = useState(programa?.currency ?? '')
  const [comissao, setComissao] = useState(
    programa?.comissao_percent != null ? String(programa.comissao_percent) : ''
  )
  const [duracao, setDuracao] = useState(programa?.duracao ?? '')
  const [brochura, setBrochura] = useState(programa?.brochura_url ?? '')
  const [link, setLink] = useState(programa?.link ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const moedaNorm = moeda.trim().toUpperCase()
    const min = custoMin.trim() ? Number(custoMin) : null
    const max = custoMax.trim() ? Number(custoMax) : null
    const val = validatePrograma({ nome, currency: moedaNorm || null, custo_min: min, custo_max: max })
    setErrors(val)
    if (Object.keys(val).length > 0) return

    setSaving(true)
    try {
      await onSubmit({
        destino_id: destinoId,
        nome: nome.trim(),
        tipo,
        custo_min: min,
        custo_max: max,
        currency: moedaNorm || null,
        comissao_percent: comissao.trim() ? Number(comissao) : null,
        duracao: duracao.trim() || null,
        brochura_url: brochura.trim() || null,
        link: link.trim() || null,
      })
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={programa ? 'Editar programa' : 'Novo programa'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass}>Nome *</label>
          <input className={inputClass} value={nome} onChange={e => setNome(e.target.value)} />
          <FieldError message={errors.nome} />
        </div>
        <div>
          <label className={labelClass}>Tipo *</label>
          <select
            className={inputClass}
            value={tipo}
            onChange={e => setTipo(e.target.value as ProgramaTipo)}
          >
            {TIPOS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Custo mín.</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={custoMin}
              onChange={e => setCustoMin(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Custo máx.</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={custoMax}
              onChange={e => setCustoMax(e.target.value)}
            />
            <FieldError message={errors.custo_max} />
          </div>
          <div>
            <label className={labelClass}>Moeda</label>
            <input
              className={inputClass}
              value={moeda}
              maxLength={3}
              onChange={e => setMoeda(e.target.value.toUpperCase())}
              placeholder="EUR"
            />
            <FieldError message={errors.currency} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>% Comissão (override)</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={comissao}
              onChange={e => setComissao(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Duração</label>
            <input
              className={inputClass}
              value={duracao}
              onChange={e => setDuracao(e.target.value)}
              placeholder="ex.: 6 meses"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Brochura (URL)</label>
          <input className={inputClass} value={brochura} onChange={e => setBrochura(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Link</label>
          <input className={inputClass} value={link} onChange={e => setLink(e.target.value)} />
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
