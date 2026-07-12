'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConversationItem } from './conversation-item'
import type { ConversaActiva } from '@/types/database'

type FiltroModo = 'todas' | 'bot' | 'humano' | 'pendentes'

interface ConversationListProps {
  conversas: ConversaActiva[]
  loading: boolean
  selected: ConversaActiva | null
  filtro: FiltroModo
  search: string
  hasMore: boolean
  pendentesCount: number
  onSelect: (conv: ConversaActiva) => void
  onFiltroChange: (f: FiltroModo) => void
  onSearchChange: (s: string) => void
  onLoadMore: () => void
}

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'bot', label: 'Bot' },
  { id: 'humano', label: 'Humano' },
  { id: 'pendentes', label: 'Pendentes' },
] as const

export function ConversationList({
  conversas,
  loading,
  selected,
  filtro,
  search,
  hasMore,
  pendentesCount,
  onSelect,
  onFiltroChange,
  onSearchChange,
  onLoadMore,
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-brand-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg">Inbox</h2>
          {pendentesCount > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendentesCount}
            </span>
          )}
        </div>

        {/* Pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar nome ou telefone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-1">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => onFiltroChange(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filtro === f.id
                  ? 'bg-rose-500 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-400 animate-pulse">
            A carregar conversas...
          </div>
        ) : conversas.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            Nenhuma conversa encontrada
          </div>
        ) : (
          <>
            {conversas.map((conv) => (
              <ConversationItem
                key={conv.conversa_id}
                conversa={conv}
                isSelected={selected?.conversa_id === conv.conversa_id}
                onClick={() => onSelect(conv)}
              />
            ))}
            {hasMore && (
              <button
                onClick={onLoadMore}
                className="w-full py-3 text-xs text-rose-500 hover:text-rose-600 font-medium"
              >
                Carregar mais...
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
