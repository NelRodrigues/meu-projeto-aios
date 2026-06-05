'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { X, Loader2, Save, ImagePlus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface SharedProductInput {
  id?: string
  nome: string
  descricao: string
  valor: string
  formato: string
  duracao: string
  category: string
  activo: boolean
  imagem_url?: string | null
}

interface SharedProductFormProps {
  inicial?: SharedProductInput
  onSave: (data: SharedProductInput) => Promise<void>
  onClose: () => void
}

const CATEGORIAS = ['chantilly', 'bento', 'ganache', 'doces', 'casamento', 'especiais', 'outro']

export function SharedProductForm({ inicial, onSave, onClose }: SharedProductFormProps) {
  const [form, setForm] = useState<SharedProductInput>(
    inicial ?? { nome: '', descricao: '', valor: '', formato: 'padrao', duracao: '', category: 'outro', activo: true, imagem_url: null }
  )
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) { setErro('Selecciona uma imagem válida.'); return }
    if (file.size > 5 * 1024 * 1024) { setErro('A imagem não pode exceder 5 MB.'); return }
    setUploading(true)
    setErro(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `catalogo/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('portfolio').getPublicUrl(path)
      setForm((f) => ({ ...f, imagem_url: pub.publicUrl }))
    } catch (e) {
      setErro(e instanceof Error ? `Falha no upload: ${e.message}` : 'Falha no upload da imagem')
    } finally {
      setUploading(false)
    }
  }

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
          {/* Imagem de capa */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Imagem de capa</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
            />
            {form.imagem_url ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <Image src={form.imagem_url} alt="Capa" fill sizes="500px" className="object-cover" />
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-white"
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imagem_url: null }))}
                    className="rounded-lg bg-white/90 p-1.5 text-gray-600 shadow-sm hover:bg-white hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 transition-colors hover:border-rose-300 hover:text-rose-400 disabled:opacity-50"
              >
                {uploading ? (
                  <><Loader2 className="h-6 w-6 animate-spin" /><span className="text-xs">A carregar...</span></>
                ) : (
                  <><ImagePlus className="h-7 w-7" /><span className="text-xs">Carregar foto do bolo</span></>
                )}
              </button>
            )}
          </div>

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
