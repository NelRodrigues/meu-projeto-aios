'use client'

import { useState } from 'react'
import { X, Lock, Unlock, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CalendarioDia } from '@/types/database'

interface PedidoDia {
  id: string
  cliente_nome: string
  produto_nome: string | null
  hora_entrega: string | null
  modo_entrega: string
  valor_final: number | null
}

interface DayDetailModalProps {
  dia: CalendarioDia
  onClose: () => void
  onUpdate: () => void
}

export function DayDetailModal({ dia, onClose, onUpdate }: DayDetailModalProps) {
  const [pedidos, setPedidos] = useState<PedidoDia[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(true)
  const [editandoCapacidade, setEditandoCapacidade] = useState(false)
  const [novaCapacidade, setNovaCapacidade] = useState(dia.capacidade_maxima)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  // Carregar pedidos deste dia
  useState(() => {
    supabase
      .from('pedidos')
      .select(`
        id,
        hora_entrega,
        modo_entrega,
        valor_final,
        clientes!cliente_id(nome),
        produtos_catalogo!produto_id(nome)
      `)
      .eq('data_entrega', dia.data)
      .not('estado', 'in', '(cancelado,entregue)')
      .order('hora_entrega')
      .then(({ data }) => {
        if (data) {
          type PedidoDiaRow = {
            id: string
            hora_entrega: string | null
            modo_entrega: string
            valor_final: number | null
            clientes: { nome: string | null } | { nome: string | null }[] | null
            produtos_catalogo: { nome: string | null } | { nome: string | null }[] | null
          }
          const um = <T,>(rel: T | T[] | null): T | null =>
            Array.isArray(rel) ? rel[0] ?? null : rel ?? null
          setPedidos((data as unknown as PedidoDiaRow[]).map((p) => ({
            id: p.id,
            cliente_nome: um(p.clientes)?.nome ?? 'Desconhecido',
            produto_nome: um(p.produtos_catalogo)?.nome ?? null,
            hora_entrega: p.hora_entrega,
            modo_entrega: p.modo_entrega,
            valor_final: p.valor_final,
          })))
        }
        setLoadingPedidos(false)
      })
  })

  const toggleBloqueado = async () => {
    setSaving(true)
    await supabase
      .from('calendario_producao')
      .upsert({ data: dia.data, bloqueado: !dia.bloqueado, capacidade_maxima: dia.capacidade_maxima })
      .eq('data', dia.data)
    onUpdate()
    onClose()
  }

  const salvarCapacidade = async () => {
    setSaving(true)
    await supabase
      .from('calendario_producao')
      .upsert({ data: dia.data, capacidade_maxima: novaCapacidade, bloqueado: dia.bloqueado })
    setEditandoCapacidade(false)
    setSaving(false)
    onUpdate()
  }

  const dataFormatada = new Date(dia.data + 'T00:00:00').toLocaleDateString('pt-AO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const STATUS_LABELS: Record<string, string> = {
    disponivel: 'Disponível',
    quase_lotado: 'Quase lotado',
    lotado: 'Lotado',
    bloqueado: 'Bloqueado',
    passado: 'Passado',
  }
  const STATUS_COLORS: Record<string, string> = {
    disponivel: 'bg-emerald-100 text-emerald-700',
    quase_lotado: 'bg-amber-100 text-amber-700',
    lotado: 'bg-red-100 text-red-700',
    bloqueado: 'bg-gray-100 text-gray-600',
    passado: 'bg-gray-100 text-gray-500',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="font-semibold text-gray-900 capitalize">{dataFormatada}</h2>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[dia.status]}`}>
              {STATUS_LABELS[dia.status]}
            </span>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Stats */}
        {dia.status !== 'bloqueado' && (
          <div className="grid grid-cols-3 gap-3 p-4 pb-0">
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{dia.pedidos_agendados}</p>
              <p className="text-xs text-gray-500">Pedidos</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{dia.vagas_disponiveis}</p>
              <p className="text-xs text-gray-500">Vagas</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              {editandoCapacidade ? (
                <div className="flex items-center gap-1 justify-center">
                  <input
                    type="number"
                    value={novaCapacidade}
                    onChange={(e) => setNovaCapacidade(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
                    className="w-10 rounded border border-gray-200 text-center text-lg font-bold outline-none focus:border-rose-400"
                  />
                </div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{dia.capacidade_maxima}</p>
              )}
              <p className="text-xs text-gray-500">Capacidade</p>
            </div>
          </div>
        )}

        {/* Pedidos do dia */}
        <div className="p-4">
          {!dia.bloqueado && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Pedidos agendados</h3>
              {loadingPedidos ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
                </div>
              ) : pedidos.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum pedido agendado</p>
              ) : (
                <div className="space-y-2">
                  {pedidos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.cliente_nome}</p>
                        <p className="text-xs text-gray-500">
                          {p.produto_nome ?? 'Produto personalizado'}
                          {p.hora_entrega ? ` — ${p.hora_entrega.substring(0, 5)}` : ''}
                        </p>
                      </div>
                      {p.valor_final && (
                        <span className="text-sm font-semibold text-rose-600">
                          {p.valor_final.toLocaleString('pt-AO')} Kz
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Accoes */}
        <div className="flex items-center justify-between border-t p-4">
          <div className="flex gap-2">
            {/* Bloquear/Desbloquear */}
            <button
              onClick={toggleBloqueado}
              disabled={saving}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                dia.bloqueado
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {dia.bloqueado ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {dia.bloqueado ? 'Desbloquear' : 'Bloquear dia'}
            </button>

            {/* Alterar capacidade */}
            {!dia.bloqueado && (
              editandoCapacidade ? (
                <button
                  onClick={salvarCapacidade}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600"
                >
                  Guardar
                </button>
              ) : (
                <button
                  onClick={() => setEditandoCapacidade(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" />
                  Capacidade
                </button>
              )
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
