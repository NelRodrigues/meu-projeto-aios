'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { KanbanBoard } from '@/components/pedidos/kanban-board'
import { usePedidos } from '@/hooks/use-pedidos'
import type { PedidoComCliente, PedidoEstado } from '@/types/database'

export default function PedidosPage() {
  const { pedidos, loading, error, mudarEstado } = usePedidos()
  const [selectedPedido, setSelectedPedido] = useState<PedidoComCliente | null>(null)

  const handleEstadoChange = async (pedidoId: string, novoEstado: PedidoEstado) => {
    await mudarEstado(pedidoId, novoEstado)
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'A carregar...' : `${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} activos`}
          </p>
        </div>
        <Link
          href="/pedidos/novo"
          className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-600 active:bg-rose-700"
        >
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Link>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            pedidos={pedidos}
            onEstadoChange={handleEstadoChange}
            onCardClick={setSelectedPedido}
          />
        </div>
      )}

      {/* Detalhe do pedido (modal simples) */}
      {selectedPedido && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedPedido(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">{selectedPedido.cliente_nome}</h2>
            {selectedPedido.produto_nome && (
              <p className="mt-1 text-sm text-gray-500">{selectedPedido.produto_nome}</p>
            )}
            {selectedPedido.tema && (
              <p className="mt-1 text-sm text-rose-600">Tema: {selectedPedido.tema}</p>
            )}
            {selectedPedido.tamanho && (
              <p className="mt-1 text-sm text-gray-600">Tamanho: {selectedPedido.tamanho}</p>
            )}
            {selectedPedido.descricao && (
              <p className="mt-2 text-sm text-gray-600">{selectedPedido.descricao}</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Entrega</p>
                <p className="font-medium">
                  {new Date(selectedPedido.data_entrega + 'T00:00:00').toLocaleDateString('pt-AO', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Valor</p>
                <p className="font-medium text-rose-600">
                  {selectedPedido.valor_final || selectedPedido.valor_orcamento
                    ? `${(selectedPedido.valor_final ?? selectedPedido.valor_orcamento!).toLocaleString('pt-AO')} Kz`
                    : '—'}
                </p>
              </div>
            </div>
            {selectedPedido.notas && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                {selectedPedido.notas}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedPedido(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
