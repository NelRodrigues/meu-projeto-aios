'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { OrderCard } from './order-card'
import type { PedidoComCliente, PedidoEstado } from '@/types/database'

interface ColConfig {
  label: string
  color: string
  headerColor: string
  dot: string
}

export const COLUMN_CONFIG: Record<PedidoEstado, ColConfig> = {
  novo: {
    label: 'Novo',
    color: 'bg-gray-50 border-gray-200',
    headerColor: 'text-gray-700',
    dot: 'bg-gray-400',
  },
  orcamento: {
    label: 'Orçamento',
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'text-blue-700',
    dot: 'bg-blue-400',
  },
  confirmado: {
    label: 'Confirmado',
    color: 'bg-purple-50 border-purple-200',
    headerColor: 'text-purple-700',
    dot: 'bg-purple-400',
  },
  pago: {
    label: 'Pago',
    color: 'bg-emerald-50 border-emerald-200',
    headerColor: 'text-emerald-700',
    dot: 'bg-emerald-400',
  },
  em_producao: {
    label: 'Em Produção',
    color: 'bg-amber-50 border-amber-200',
    headerColor: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  pronto: {
    label: 'Pronto',
    color: 'bg-teal-50 border-teal-200',
    headerColor: 'text-teal-700',
    dot: 'bg-teal-400',
  },
  entregue: {
    label: 'Entregue',
    color: 'bg-green-50 border-green-200',
    headerColor: 'text-green-700',
    dot: 'bg-green-400',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-50 border-red-200',
    headerColor: 'text-red-700',
    dot: 'bg-red-300',
  },
}

interface KanbanColumnProps {
  estado: PedidoEstado
  pedidos: PedidoComCliente[]
  onCardClick?: (pedido: PedidoComCliente) => void
}

export function KanbanColumn({ estado, pedidos, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: estado })
  const config = COLUMN_CONFIG[estado]

  return (
    <div
      className={`flex shrink-0 flex-col rounded-2xl border ${config.color} ${
        isOver ? 'ring-2 ring-rose-400 ring-offset-2' : ''
      } w-64 transition-all`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${config.dot}`} />
          <span className={`text-sm font-semibold ${config.headerColor}`}>{config.label}</span>
        </div>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-500">
          {pedidos.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={pedidos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex flex-col gap-2 overflow-y-auto p-2 min-h-[120px]"
        >
          {pedidos.map((pedido) => (
            <OrderCard
              key={pedido.id}
              pedido={pedido}
              onClick={() => onCardClick?.(pedido)}
            />
          ))}
          {pedidos.length === 0 && (
            <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
              Sem pedidos
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
