'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, ChevronLeft, ChevronRight, AlertCircle, CakeSlice, Upload, Download } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ClientTable } from '@/components/clientes/client-table'
import { useClientes } from '@/hooks/use-clientes'
import { exportClientesCsv, downloadCsv } from '@/lib/csv-utils'
import type { ClienteEstagio } from '@/types/database'

const ESTAGIOS: { value: ClienteEstagio | ''; label: string }[] = [
  { value: '', label: 'Todos os estagios' },
  { value: 'novo', label: 'Novo' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'orcamento', label: 'Orcamento' },
  { value: 'activo', label: 'Activo' },
  { value: 'vip', label: 'VIP' },
  { value: 'inactivo', label: 'Inactivo' },
]

const PAGE_SIZE = 20

export default function ClientesPage() {
  const { clientes, loading, error } = useClientes()
  const [search, setSearch] = useState('')
  const [filterEstagio, setFilterEstagio] = useState<ClienteEstagio | ''>('')
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState<'nome' | 'ultima_compra' | 'total_gasto'>('ultima_compra')

  const filtered = useMemo(() => {
    let result = [...clientes]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        (c.telefone && c.telefone.includes(q))
      )
    }

    if (filterEstagio) {
      result = result.filter(c => c.estagio === filterEstagio)
    }

    result.sort((a, b) => {
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome)
      if (sortBy === 'total_gasto') return (b.total_gasto || 0) - (a.total_gasto || 0)
      // ultima_compra — mais recente primeiro
      const dateA = a.ultima_compra ? new Date(a.ultima_compra).getTime() : 0
      const dateB = b.ultima_compra ? new Date(b.ultima_compra).getTime() : 0
      return dateB - dateA
    })

    return result
  }, [clientes, search, filterEstagio, sortBy])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  // Pagina derivada: nunca passa dos limites actuais (evita setState durante render).
  // Os handlers de filtro/pesquisa/ordenacao ja fazem setPage(0).
  const safePage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0
  const paginated = useMemo(() => {
    const start = safePage * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CakeSlice className="h-6 w-6 text-rose-500" />
            <h1 className="font-heading text-2xl font-bold text-gray-900">Clientes</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== clientes.length && ` de ${clientes.length}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const csv = exportClientesCsv(filtered)
              downloadCsv(csv, `clientes-${new Date().toISOString().split('T')[0]}.csv`)
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <Link
            href="/clientes/importar"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Link>
          <Link
            href="/clientes/novo"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou telefone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <select
          value={filterEstagio}
          onChange={e => { setFilterEstagio(e.target.value as ClienteEstagio | ''); setPage(0) }}
          className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
        >
          {ESTAGIOS.map(e => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value as typeof sortBy); setPage(0) }}
          className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
        >
          <option value="ultima_compra">Ultima compra</option>
          <option value="nome">Nome</option>
          <option value="total_gasto">Total gasto</option>
        </select>
      </div>

      {/* Tabela */}
      <ClientTable clientes={paginated} loading={loading} />

      {/* Paginacao */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500">
            A mostrar {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className={cn(
                'p-1.5 rounded-lg border transition-colors',
                safePage === 0 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">{safePage + 1} / {totalPages}</span>
            <button
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
              className={cn(
                'p-1.5 rounded-lg border transition-colors',
                safePage >= totalPages - 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
