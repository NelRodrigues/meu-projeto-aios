'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Upload, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Produto, ProdutoCategoria } from '@/types/database'

const CATEGORIAS: { value: ProdutoCategoria; label: string }[] = [
  { value: 'chantilly', label: 'Chantilly' },
  { value: 'bento_cake', label: 'Bento Cake' },
  { value: 'especiais', label: 'Especiais' },
  { value: 'naked_vintage', label: 'Naked/Vintage' },
  { value: 'doces', label: 'Doces' },
  { value: 'casamento', label: 'Casamento' },
  { value: 'outro', label: 'Outro' },
]

interface ProductFormProps {
  produto?: Produto
  onSave: (data: Partial<Produto>) => Promise<void>
  onClose: () => void
}

export function ProductForm({ produto, onSave, onClose }: ProductFormProps) {
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [categoria, setCategoria] = useState<ProdutoCategoria>(produto?.categoria ?? 'chantilly')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(produto?.tags ?? [])
  const [precoBase, setPrecoBase] = useState(produto?.preco_base?.toString() ?? '')
  const [precosPorTamanho, setPrecosPorTamanho] = useState<{ tamanho: string; preco: string }[]>(
    Object.entries(produto?.precos_por_tamanho ?? {}).map(([t, p]) => ({ tamanho: t, preco: String(p) }))
  )
  const [sobConsulta, setSobConsulta] = useState(produto?.sob_consulta ?? false)
  const [complexidade, setComplexidade] = useState(produto?.complexidade ?? 3)
  const [tempoProducao, setTempoProducao] = useState(produto?.tempo_producao_horas?.toString() ?? '48')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const addPreco = () => setPrecosPorTamanho([...precosPorTamanho, { tamanho: '', preco: '' }])

  const removePreco = (idx: number) => setPrecosPorTamanho(precosPorTamanho.filter((_, i) => i !== idx))

  const updatePreco = (idx: number, field: 'tamanho' | 'preco', value: string) => {
    setPrecosPorTamanho(precosPorTamanho.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `produtos/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('portfolio').upload(path, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
      // For now just show the URL — full foto management would update fotos[] array
      alert(`Foto enviada: ${data.publicUrl}`)
    } catch {
      setError('Erro ao enviar foto')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      setError('Nome é obrigatório')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const precos: Record<string, number> = {}
      for (const p of precosPorTamanho) {
        if (p.tamanho && p.preco) {
          precos[p.tamanho] = parseFloat(p.preco)
        }
      }
      await onSave({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        categoria,
        tags,
        preco_base: precoBase ? parseFloat(precoBase) : null,
        precos_por_tamanho: precos,
        sob_consulta: sobConsulta,
        complexidade,
        tempo_producao_horas: parseInt(tempoProducao) || 48,
        activo: produto?.activo ?? true,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar produto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {produto ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {/* Nome */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Bolo Chantilly 16cm"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              required
            />
          </div>

          {/* Descricao */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descrição do produto..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as ProdutoCategoria)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Adicionar tag..."
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sob consulta toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSobConsulta(!sobConsulta)}
              className={`relative h-6 w-11 rounded-full transition-colors ${sobConsulta ? 'bg-rose-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${sobConsulta ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <label className="text-sm font-medium text-gray-700">Sob consulta (preço não fixo)</label>
          </div>

          {/* Preco base */}
          {!sobConsulta && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Preço base (Kz)</label>
              <input
                type="number"
                value={precoBase}
                onChange={(e) => setPrecoBase(e.target.value)}
                placeholder="Ex: 42000"
                min="0"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>
          )}

          {/* Precos por tamanho */}
          {!sobConsulta && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Preços por tamanho</label>
                <button
                  type="button"
                  onClick={addPreco}
                  className="text-xs text-rose-600 hover:text-rose-700"
                >
                  + Adicionar
                </button>
              </div>
              {precosPorTamanho.map((p, idx) => (
                <div key={idx} className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={p.tamanho}
                    onChange={(e) => updatePreco(idx, 'tamanho', e.target.value)}
                    placeholder="Tamanho (ex: 16cm)"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
                  />
                  <input
                    type="number"
                    value={p.preco}
                    onChange={(e) => updatePreco(idx, 'preco', e.target.value)}
                    placeholder="Kz"
                    min="0"
                    className="w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
                  />
                  <button
                    type="button"
                    onClick={() => removePreco(idx)}
                    className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Complexidade */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Complexidade ({complexidade}/5)
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setComplexidade(n)}
                  className="rounded p-1"
                >
                  <Star
                    className={`h-6 w-6 ${n <= complexidade ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Tempo de producao */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tempo de produção (horas)</label>
            <select
              value={tempoProducao}
              onChange={(e) => setTempoProducao(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            >
              <option value="24">24 horas (1 dia)</option>
              <option value="48">48 horas (2 dias)</option>
              <option value="72">72 horas (3 dias)</option>
              <option value="96">96 horas (4 dias)</option>
            </select>
          </div>

          {/* Upload foto */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Foto principal</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 hover:border-rose-300 hover:text-rose-500">
              <Upload className="h-4 w-4" />
              <span>{uploading ? 'A enviar...' : 'Clique para enviar foto'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
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
              {saving ? 'A guardar...' : (produto ? 'Guardar' : 'Criar Produto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
