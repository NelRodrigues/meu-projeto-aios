'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import { OrderCard } from './order-card'
import type { PedidoComCliente, PedidoEstado } from '@/types/database'

const ESTADOS: PedidoEstado[] = [
  'novo',
  'orcamento',
  'confirmado',
  'pago',
  'em_producao',
  'pronto',
  'entregue',
  'cancelado',
]

interface KanbanBoardProps {
  pedidos: PedidoComCliente[]
  onEstadoChange: (pedidoId: string, novoEstado: PedidoEstado) => Promise<void>
  onCardClick?: (pedido: PedidoComCliente) => void
}

export function KanbanBoard({ pedidos, onEstadoChange, onCardClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localPedidos, setLocalPedidos] = useState<PedidoComCliente[]>(pedidos)

  // Sync when external pedidos change
  if (JSON.stringify(pedidos.map((p) => p.id + p.estado)) !== JSON.stringify(localPedidos.map((p) => p.id + p.estado))) {
    setLocalPedidos(pedidos)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getPedidosByEstado = useCallback(
    (estado: PedidoEstado) => localPedidos.filter((p) => p.estado === estado),
    [localPedidos]
  )

  const findEstadoByPedidoId = useCallback(
    (id: string): PedidoEstado | null => {
      return localPedidos.find((p) => p.id === id)?.estado ?? null
    },
    [localPedidos]
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeEstado = findEstadoByPedidoId(active.id as string)
    // over.id can be a pedido id OR a estado id (column)
    const overEstado = ESTADOS.includes(over.id as PedidoEstado)
      ? (over.id as PedidoEstado)
      : findEstadoByPedidoId(over.id as string)

    if (!activeEstado || !overEstado || activeEstado === overEstado) return

    // Move to new column optimistically
    setLocalPedidos((prev) =>
      prev.map((p) => (p.id === active.id ? { ...p, estado: overEstado } : p))
    )
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const pedido = localPedidos.find((p) => p.id === active.id)
    if (!pedido) return

    const targetEstado = ESTADOS.includes(over.id as PedidoEstado)
      ? (over.id as PedidoEstado)
      : findEstadoByPedidoId(over.id as string)

    if (!targetEstado) return

    if (pedido.estado !== targetEstado) {
      try {
        await onEstadoChange(pedido.id, targetEstado)
      } catch {
        // Revert optimistic update on error
        setLocalPedidos(pedidos)
      }
    }
  }

  const activePedido = activeId ? localPedidos.find((p) => p.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {ESTADOS.map((estado) => (
          <KanbanColumn
            key={estado}
            estado={estado}
            pedidos={getPedidosByEstado(estado)}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activePedido ? (
          <div className="rotate-2 shadow-xl">
            <OrderCard pedido={activePedido} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
