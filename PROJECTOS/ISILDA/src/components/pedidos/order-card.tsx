'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, Calendar, Package, User } from 'lucide-react'
import type { PedidoComCliente } from '@/types/database'

interface OrderCardProps {
  pedido: PedidoComCliente
  onClick?: () => void
}

function isUrgente(dataEntrega: string): boolean {
  const entrega = new Date(dataEntrega)
  const agora = new Date()
  const diffHoras = (entrega.getTime() - agora.getTime()) / (1000 * 60 * 60)
  return diffHoras > 0 && diffHoras <= 48
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' })
}

export function OrderCard({ pedido, onClick }: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pedido.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const urgente = isUrgente(pedido.data_entrega)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-all hover:shadow-md active:shadow-lg ${
        isDragging ? 'ring-2 ring-rose-400' : ''
      } ${urgente ? 'border-orange-200' : 'border-gray-100'}`}
    >
      {/* Urgencia */}
      {urgente && (
        <div className="mb-2 flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1">
          <AlertTriangle className="h-3 w-3 text-orange-500" />
          <span className="text-xs font-medium text-orange-600">Urgente — {formatDate(pedido.data_entrega)}</span>
        </div>
      )}

      {/* Cliente */}
      <div className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="truncate text-sm font-medium text-gray-900">{pedido.cliente_nome}</span>
      </div>

      {/* Produto */}
      {(pedido.produto_nome || pedido.descricao) && (
        <div className="mt-1 flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 shrink-0 text-gray-300" />
          <span className="truncate text-xs text-gray-500">
            {pedido.produto_nome ?? pedido.descricao}
          </span>
        </div>
      )}

      {/* Tema */}
      {pedido.tema && (
        <p className="mt-1 truncate text-xs text-gray-400 pl-5">{pedido.tema}</p>
      )}

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        {!urgente && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(pedido.data_entrega)}</span>
          </div>
        )}
        {pedido.valor_final || pedido.valor_orcamento ? (
          <span className="ml-auto text-xs font-semibold text-rose-600">
            {(pedido.valor_final ?? pedido.valor_orcamento!).toLocaleString('pt-AO')} Kz
          </span>
        ) : null}
      </div>
    </div>
  )
}
