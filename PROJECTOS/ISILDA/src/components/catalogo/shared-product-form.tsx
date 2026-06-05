'use client'

import { useState } from 'react'
import { X, Loader2, Save } from 'lucide-react'

export interface SharedProductInput {
  id?: string
  nome: string
  descricao: string
  valor: string
  formato: string
  duracao: string
  category: string
  activo: boolean
}

interface SharedProductFormProps {
  inicial?: SharedProductInput
  onSave: (data: SharedProductInput) => Promise<void>
  onClose: () => void
}

const CATEGORIAS = ['chantilly', 'bento', 'ganache', 'doces', 'casamento', 'especiais', 'outro']

export function SharedProductForm({ inicial, onSave, onClose }: SharedProductFormProps) {
  const [form, setForm] = useState<SharedProductInput>(
    inicial ?? { nome: '', descricao: '', valor: '', formato: 'padrao', duracao: '', category: 'outro', activo: true }
  )
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function submeter() {
    if (!form.nome.trim()) { setErro('O nome é obrigatório.'); return }
    setSaving(true)
    setErro(null)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {inicial?.id ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Nome</label>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              placeholder="Ex: Bolo Chantilly 16cm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              placeholder="Breve descrição do produto"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Preço (Kz)</label>
              <input
                type="number"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Formato</label>
              <input
                value={form.formato}
                onChange={(e) => setForm({ ...form, formato: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                placeholder="padrao"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Duração / Antecedência</label>
              <input
                value={form.duracao}
                onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                placeholder="Ex: 48 horas"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="h-4 w-4 accent-rose-600"
            />
            <span className="text-sm text-gray-700">Produto activo (visível para a Soraya e no catálogo)</span>
          </label>

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={submeter}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
