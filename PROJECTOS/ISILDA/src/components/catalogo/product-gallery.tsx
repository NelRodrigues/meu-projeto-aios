'use client'

import { useState } from 'react'
import { Search, Plus, Filter } from 'lucide-react'
import { ProductCard } from './product-card'
import type { Produto, ProdutoCategoria } from '@/types/database'

const CATEGORIAS: { value: ProdutoCategoria | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todos' },
  { value: 'chantilly', label: 'Chantilly' },
  { value: 'bento_cake', label: 'Bento Cake' },
  { value: 'especiais', label: 'Especiais' },
  { value: 'naked_vintage', label: 'Naked/Vintage' },
  { value: 'doces', label: 'Doces' },
  { value: 'casamento', label: 'Casamento' },
]

interface ProductGalleryProps {
  produtos: Produto[]
  onNovo?: () => void
  onEdit?: (produto: Produto) => void
  onToggleActivo?: (produto: Produto) => void
}

export function ProductGallery({ produtos, onNovo, onEdit, onToggleActivo }: ProductGalleryProps) {
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<ProdutoCategoria | 'todas'>('todas')
  const [showInativos, setShowInativos] = useState(false)

  const filtered = produtos.filter((p) => {
    if (!showInativos && !p.activo) return false
    if (categoria !== 'todas' && p.categoria !== categoria) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.nome.toLowerCase().includes(q) ||
        p.descricao?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>

        {/* Toggle inativos */}
        <button
          onClick={() => setShowInativos(!showInativos)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
            showInativos
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
          }`}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">{showInativos ? 'Ocultar inativos' : 'Mostrar inativos'}</span>
        </button>

        {/* Novo produto */}
        {onNovo && (
          <button
            onClick={onNovo}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-600 active:bg-rose-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Produto</span>
          </button>
        )}
      </div>

      {/* Categorias */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIAS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoria(c.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              categoria === c.value
                ? 'bg-rose-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-rose-200 hover:text-rose-600'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Contagem */}
      <p className="text-sm text-gray-500">
        {filtered.length} produto{filtered.length !== 1 ? 's' : ''}
        {categoria !== 'todas' ? ` em ${CATEGORIAS.find((c) => c.value === categoria)?.label}` : ''}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-500">Nenhum produto encontrado</p>
          {onNovo && (
            <button
              onClick={onNovo}
              className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
            >
              Adicionar primeiro produto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((produto) => (
            <ProductCard
              key={produto.id}
              produto={produto}
              onEdit={onEdit}
              onToggleActivo={onToggleActivo}
            />
          ))}
        </div>
      )}
    </div>
  )
}
