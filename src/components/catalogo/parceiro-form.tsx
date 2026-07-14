'use client'

import { useState } from 'react'
import { Modal, inputClass, labelClass, FieldError } from './modal'
import type { Parceiro } from '@/types/database'

interface Props {
  parceiro?: Parceiro | null
  onClose: () => void
  onSubmit: (data: Partial<Parceiro>) => Promise<void>
}

// Formulário criar/editar parceiro (story 2.2).
export function ParceiroForm({ parceiro, onClose, onSubmit }: Props) {
  const [nome, setNome] = useState(parceiro?.nome ?? '')
  const [tipo, setTipo] = useState(parceiro?.tipo ?? '')
  const [comissao, setComissao] = useState(
    parceiro?.comissao_percent != null ? String(parceiro.comissao_percent) : ''
  )
  const [website, setWebsite] = useState(parceiro?.website ?? '')
  const [brochura, setBrochura] = useState(parceiro?.brochura_url ?? '')
  const [notas, setNotas] = useState(parceiro?.notas ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [nomeErro, setNomeErro] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!nome.trim()) {
      setNomeErro('O nome é obrigatório.')
      return
    }
    setNomeErro(undefined)
    setSaving(true)
    try {
      await onSubmit({
        nome: nome.trim(),
        tipo: tipo.trim() || null,
        comissao_percent: comissao.trim() ? Number(comissao) : null,
        website: website.trim() || null,
        brochura_url: brochura.trim() || null,
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
    <Modal title={parceiro ? 'Editar parceiro' : 'Novo parceiro'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass}>Nome *</label>
          <input className={inputClass} value={nome} onChange={e => setNome(e.target.value)} />
          <FieldError message={nomeErro} />
        </div>
        <div>
          <label className={labelClass}>Tipo</label>
          <input
            className={inputClass}
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            placeholder="universidade / escola de línguas / alojamento…"
          />
        </div>
        <div>
          <label className={labelClass}>% Comissão base</label>
          <input
            className={inputClass}
            type="number"
            step="0.01"
            min="0"
            value={comissao}
            onChange={e => setComissao(e.target.value)}
            placeholder="ex.: 12.5"
          />
        </div>
        <div>
          <label className={labelClass}>Website</label>
          <input className={inputClass} value={website} onChange={e => setWebsite(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Brochura (URL)</label>
          <input className={inputClass} value={brochura} onChange={e => setBrochura(e.target.value)} />
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
