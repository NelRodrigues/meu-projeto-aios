'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSharedBackendMode } from '@/lib/backend/config'
import { mapSharedDealToPedido, mapSharedDealStatus } from '@/lib/backend/shared-mappers'
import type { Pedido, PedidoEstado, PedidoComCliente } from '@/types/database'

export function usePedidos() {
  const sharedMode = isSharedBackendMode()
  const [pedidos, setPedidos] = useState<PedidoComCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchPedidos = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from(sharedMode ? 'deals' : 'pedidos')
      .select(sharedMode
        ? 'id,lead_id,title,status,total_paid,created_at,updated_at,expected_close_date,notes,payment_status,leads!lead_id(name,phone)'
        : `
        *,
        clientes!cliente_id(nome, telefone),
        produtos_catalogo!produto_id(nome)
      `)
      .order(sharedMode ? 'created_at' : 'data_entrega', { ascending: true })

    if (err) {
      setError(err.message)
    } else if (data) {
      const mapped: PedidoComCliente[] = sharedMode
        ? (data as unknown as Parameters<typeof mapSharedDealToPedido>[0][]).map((row) => mapSharedDealToPedido(row))
        : (data as unknown as (Pedido & {
            clientes: { nome: string | null; telefone: string | null } | null
            produtos_catalogo: { nome: string | null } | null
          })[]).map((p) => ({
            ...p,
            cliente_nome: p.clientes?.nome ?? 'Cliente desconhecido',
            cliente_telefone: p.clientes?.telefone ?? null,
            produto_nome: p.produtos_catalogo?.nome ?? null,
          }))
      setPedidos(mapped)
    }
    setLoading(false)
  }, [sharedMode, supabase])

  useEffect(() => {
    let activo = true
    // setState corre dentro do .then (nunca no corpo sincrono do effect).
    supabase
      .from(sharedMode ? 'deals' : 'pedidos')
      .select(sharedMode
        ? 'id,lead_id,title,status,total_paid,created_at,updated_at,expected_close_date,notes,payment_status,leads!lead_id(name,phone)'
        : `
        *,
        clientes!cliente_id(nome, telefone),
        produtos_catalogo!produto_id(nome)
      `)
      .order(sharedMode ? 'created_at' : 'data_entrega', { ascending: true })
      .then(({ data, error: err }) => {
        if (!activo) return
        if (err) {
          setError(err.message)
        } else if (data) {
          if (sharedMode) {
            setPedidos((data as unknown as Parameters<typeof mapSharedDealToPedido>[0][]).map((row) => mapSharedDealToPedido(row)))
          } else {
            type PedidoJoinRow = Pedido & {
              clientes: { nome: string | null; telefone: string | null } | null
              produtos_catalogo: { nome: string | null } | null
            }
            setPedidos((data as unknown as PedidoJoinRow[]).map((p) => ({
              ...p,
              cliente_nome: p.clientes?.nome ?? 'Cliente desconhecido',
              cliente_telefone: p.clientes?.telefone ?? null,
              produto_nome: p.produtos_catalogo?.nome ?? null,
            })))
          }
        }
        setLoading(false)
      })

    if (sharedMode) {
      return () => {
        activo = false
      }
    }

    const channel = supabase
      .channel('pedidos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        fetchPedidos()
      })
      .subscribe()

    return () => {
      activo = false
      supabase.removeChannel(channel)
    }
  }, [fetchPedidos, sharedMode, supabase])

  const mudarEstado = useCallback(async (pedidoId: string, novoEstado: PedidoEstado) => {
    if (sharedMode) {
      const status = mapSharedDealStatus(novoEstado)
      const payload: Record<string, string> = { status }
      if (novoEstado === 'pago') payload.payment_status = 'paid'
      const { error: err } = await supabase
        .from('deals')
        .update(payload)
        .eq('id', pedidoId)

      if (err) throw err
      setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, estado: novoEstado } : p)))
      return
    }

    const { error: err } = await supabase
      .from('pedidos')
      .update({ estado: novoEstado })
      .eq('id', pedidoId)

    if (err) throw err

    // Optimistic update
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, estado: novoEstado } : p))
    )
  }, [sharedMode, supabase])

  const criarPedido = useCallback(async (dados: Partial<Pedido>) => {
    if (sharedMode) {
      throw new Error('Modo shared: criacao de pedidos ainda nao suportada neste frontend.')
    }

    const { data, error: err } = await supabase
      .from('pedidos')
      .insert({ ...dados, estado: 'novo' })
      .select()
      .single()
    if (err) throw err
    await fetchPedidos()
    return data
  }, [sharedMode, supabase, fetchPedidos])

  return { pedidos, loading, error, mudarEstado, criarPedido, refetch: fetchPedidos }
}
