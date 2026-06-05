'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ProductGallery } from '@/components/catalogo/product-gallery'
import { ProductForm } from '@/components/catalogo/product-form'
import { SharedProductForm, type SharedProductInput } from '@/components/catalogo/shared-product-form'
import type { Produto } from '@/types/database'
import { isSharedBackendMode, PUBLIC_SHARED_TENANT_ID } from '@/lib/backend/config'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, Plus } from 'lucide-react'

const TENANT_ISI = PUBLIC_SHARED_TENANT_ID || '81bc8777-39f3-477a-8ad6-44f9dcf1eca8'

type SharedCatalogItem = {
  id: string
  nome: string
  descricao: string | null
  valor: number
  formato: string | null
  duracao: string | null
  category: string | null
  capacidade_maxima: number | null
  nivel_funil: string | null
  activo: boolean
  imagem: string
  imagem_url: string | null
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

export default function CatalogoPage() {
  const sharedMode = isSharedBackendMode()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [sharedProdutos, setSharedProdutos] = useState<SharedCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Produto | undefined>()
  const [showSharedForm, setShowSharedForm] = useState(false)
  const [editandoShared, setEditandoShared] = useState<SharedProductInput | undefined>()
  const supabase = createClient()

  const fetchProdutos = useCallback(async () => {
    if (sharedMode) {
      const { data, error } = await supabase
        .from('products')
        .select('id,nome,descricao,valor,formato,duracao,capacidade_maxima,nivel_funil,activo,category,imagem_url')
        .eq('tenant_id', TENANT_ISI)
        .order('nome')

      if (error) {
        setSharedProdutos([])
        setLoading(false)
        return
      }

      const imagens = [
        '/catalogo/chantilly.svg',
        '/catalogo/bento-cake.svg',
        '/catalogo/doces.svg',
        '/catalogo/especiais.svg',
        '/catalogo/casamento.svg',
      ]

      setSharedProdutos(
        (data ?? []).map((row, index) => {
          const produto = row as {
            id: string
            nome: string | null
            descricao: string | null
            valor: number | string | null
            formato: string | null
            duracao: string | null
            capacidade_maxima: number | null
            nivel_funil: string | null
            activo: boolean | null
            category: string | null
            imagem_url: string | null
          }
          return {
            id: produto.id,
            nome: (produto.nome || 'Produto').trim(),
            descricao: produto.descricao,
            valor: toNumber(produto.valor),
            formato: produto.formato,
            duracao: produto.duracao,
            category: produto.category,
            capacidade_maxima: produto.capacidade_maxima,
            nivel_funil: produto.nivel_funil,
            activo: Boolean(produto.activo),
            imagem: produto.imagem_url || imagens[index % imagens.length],
            imagem_url: produto.imagem_url,
          }
        })
      )
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('produtos_catalogo')
      .select('*')
      .order('categoria')
      .order('nome')
    if (!error && data) {
      setProdutos(data as Produto[])
    }
    setLoading(false)
  }, [sharedMode, supabase])

  useEffect(() => {
    if (sharedMode) {
      let activo = true
      Promise.resolve().then(() => {
        if (activo) {
          void fetchProdutos()
        }
      })
      return () => {
        activo = false
      }
    }

    let activo = true
    // setState corre dentro do .then (nunca no corpo sincrono do effect).
    supabase
      .from('produtos_catalogo')
      .select('*')
      .order('categoria')
      .order('nome')
      .then(({ data, error }) => {
        if (!activo) return
        if (!error && data) {
          setProdutos(data as Produto[])
        }
        setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [fetchProdutos, sharedMode, supabase])

  const handleNovo = () => {
    setEditando(undefined)
    setShowForm(true)
  }

  const handleEdit = (produto: Produto) => {
    setEditando(produto)
    setShowForm(true)
  }

  const handleSave = async (data: Partial<Produto>) => {
    if (sharedMode) throw new Error('Modo shared: gravacao de catalogo ainda nao suportada neste frontend.')

    if (editando) {
      const { error } = await supabase
        .from('produtos_catalogo')
        .update(data)
        .eq('id', editando.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('produtos_catalogo').insert(data)
      if (error) throw error
    }
    await fetchProdutos()
  }

  const handleToggleActivo = async (produto: Produto) => {
    if (sharedMode) return

    const { error } = await supabase
      .from('produtos_catalogo')
      .update({ activo: !produto.activo })
      .eq('id', produto.id)
    if (!error) {
      setProdutos((prev) => prev.map((p) => (p.id === produto.id ? { ...p, activo: !p.activo } : p)))
    }
  }

  // --- CRUD do catálogo no backend partilhado (products) ---
  const handleNovoShared = () => {
    setEditandoShared(undefined)
    setShowSharedForm(true)
  }

  const handleEditShared = (item: SharedCatalogItem) => {
    setEditandoShared({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || '',
      valor: item.valor ? String(item.valor) : '',
      formato: item.formato || 'padrao',
      duracao: item.duracao || '',
      category: item.category || 'outro',
      activo: item.activo,
      imagem_url: item.imagem_url,
    })
    setShowSharedForm(true)
  }

  const handleSaveShared = async (data: SharedProductInput) => {
    const payload = {
      nome: data.nome.trim(),
      name: data.nome.trim(),
      descricao: data.descricao.trim() || null,
      valor: Number(data.valor) || 0,
      formato: data.formato.trim() || null,
      duracao: data.duracao.trim() || null,
      category: data.category || null,
      activo: data.activo,
      is_active: data.activo,
      imagem_url: data.imagem_url || null,
      tenant_id: TENANT_ISI,
    }
    if (data.id) {
      const { error } = await supabase.from('products').update(payload).eq('id', data.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('products').insert(payload)
      if (error) throw error
    }
    await fetchProdutos()
  }

  const handleEliminarShared = async (item: SharedCatalogItem) => {
    if (!window.confirm(`Eliminar "${item.nome}" do catálogo? Esta acção não pode ser desfeita.`)) return
    const { error } = await supabase.from('products').delete().eq('id', item.id)
    if (error) {
      window.alert(`Falha ao eliminar: ${error.message}`)
      return
    }
    setSharedProdutos((prev) => prev.filter((p) => p.id !== item.id))
  }

  if (sharedMode) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">Catálogo</h1>
            <p className="mt-1 text-sm text-gray-500">
              Catálogo operacional da Isi no backend partilhado
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNovoShared}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-600"
            >
              <Plus className="h-4 w-4" /> Novo Produto
            </button>
            <Link
              href="/pedidos/novo"
              className="inline-flex items-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 shadow-sm hover:bg-rose-50"
            >
              Novo Pedido
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          </div>
        ) : sharedProdutos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-sm text-gray-500">
            Ainda não há produtos semeados no backend partilhado.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sharedProdutos.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <Image
                    src={item.imagem}
                    alt={item.nome}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover"
                  />
                  {/* Acções: editar / eliminar */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleEditShared(item)}
                      title="Editar"
                      className="rounded-lg bg-white/90 p-1.5 text-gray-600 shadow-sm hover:bg-white hover:text-rose-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEliminarShared(item)}
                      title="Eliminar"
                      className="rounded-lg bg-white/90 p-1.5 text-gray-600 shadow-sm hover:bg-white hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{item.nome}</h2>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.descricao}</p>
                    </div>
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      item.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {item.activo ? 'activo' : 'inactivo'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-gray-400">Preço</span>
                      {item.valor ? `${item.valor.toLocaleString('pt-AO')} Kz` : '—'}
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-gray-400">Formato</span>
                      {item.formato || '—'}
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-gray-400">Duração</span>
                      {item.duracao || '—'}
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-gray-400">Categoria</span>
                      {item.category || '—'}
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => handleEditShared(item)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleEliminarShared(item)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {showSharedForm && (
          <SharedProductForm
            inicial={editandoShared}
            onSave={handleSaveShared}
            onClose={() => { setShowSharedForm(false); setEditandoShared(undefined) }}
          />
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Catálogo</h1>
        <p className="mt-1 text-sm text-gray-500">Gerir produtos e preços — {produtos.filter((p) => p.activo).length} activos</p>
      </div>

      <ProductGallery
        produtos={produtos}
        onNovo={handleNovo}
        onEdit={handleEdit}
        onToggleActivo={handleToggleActivo}
      />

      {showForm && (
        <ProductForm
          produto={editando}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditando(undefined)
          }}
        />
      )}
    </div>
  )
}
