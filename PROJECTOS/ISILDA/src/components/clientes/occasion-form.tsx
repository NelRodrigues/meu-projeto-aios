'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const TIPO_OPTIONS = [
  { value: 'aniversario_proprio', label: 'Aniversário próprio' },
  { value: 'aniversario_filho', label: 'Aniversário de filho(a)' },
  { value: 'aniversario_familiar', label: 'Aniversário familiar' },
  { value: 'casamento', label: 'Casamento' },
  { value: 'batizado', label: 'Batizado' },
  { value: 'formatura', label: 'Formatura' },
  { value: 'natal', label: 'Natal' },
  { value: 'outro', label: 'Outro evento' },
]

const MESES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

interface OccasionFormProps {
  onSave: (data: {
    tipo: string
    nome_pessoa: string | null
    data_evento: string
    ano_especifico: number | null
    notas: string | null
  }) => Promise<void>
  onClose: () => void
}

export function OccasionForm({ onSave, onClose }: OccasionFormProps) {
  const [tipo, setTipo] = useState('aniversario_proprio')
  const [nomePessoa, setNomePessoa] = useState('')
  const [dia, setDia] = useState('01')
  const [mes, setMes] = useState('01')
  const [anoEspecifico, setAnoEspecifico] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({
        tipo,
        nome_pessoa: nomePessoa.trim() || null,
        data_evento: `${mes}-${dia.padStart(2, '0')}`,
        ano_especifico: anoEspecifico ? parseInt(anoEspecifico) : null,
        notas: notas.trim() || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold text-gray-900">Nova Ocasião</h3>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de evento</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome da pessoa</label>
            <input
              type="text"
              value={nomePessoa}
              onChange={(e) => setNomePessoa(e.target.value)}
              placeholder="Ex: Maria, filho João..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Dia</label>
              <input
                type="number"
                value={dia}
                onChange={(e) => setDia(e.target.value.padStart(2, '0'))}
                min="1"
                max="31"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Mês</label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ano específico <span className="text-gray-400 font-normal">(opcional — para eventos únicos)</span>
            </label>
            <input
              type="number"
              value={anoEspecifico}
              onChange={(e) => setAnoEspecifico(e.target.value)}
              placeholder={`${new Date().getFullYear()}`}
              min="2024"
              max="2030"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Preferencias, alergias, tema habitual..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {saving ? 'A guardar...' : 'Guardar Ocasião'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
