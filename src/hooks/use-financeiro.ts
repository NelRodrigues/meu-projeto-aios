'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Financeiro, Factura } from '@/types/database'

// ============================================================
// Hook do financeiro (story 2.6) — registos financeiros + facturas.
// Segue o padrão de use-catalogo: browser client, setState só em callbacks.
// Traz financeiro e facturas de uma vez (dataset pequeno; RLS já restringe a
// admin) e expõe CRUD que actualiza o estado local + invocação do lembrete D-5.
//
// RLS: financeiro/facturas são só-admin (migração 025). Um utilizador de operação
// recebe 0 linhas — a UI mostra o aviso de acesso quando não há dados nem erro.
// ============================================================

// Enriquecimento leve para a UI: nome do parceiro e do lead sem N+1.
export interface FinanceiroRow extends Financeiro {
  parceiro_nome: string | null
  lead_nome: string | null
}

interface FinanceiroJoin extends Financeiro {
  parceiros: { nome: string | null } | null
  leads: { nome: string | null } | null
}

const SELECT_FIN = '*, parceiros:parceiro_id(nome), leads:lead_id(nome)'

function toRow(r: FinanceiroJoin): FinanceiroRow {
  const { parceiros, leads, ...base } = r
  return {
    ...base,
    parceiro_nome: parceiros?.nome ?? null,
    lead_nome: leads?.nome ?? null,
  }
}

export function useFinanceiro() {
  const supabase = useMemo(() => createClient(), [])
  const [registos, setRegistos] = useState<FinanceiroRow[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [fRes, factRes] = await Promise.all([
      supabase.from('financeiro').select(SELECT_FIN).order('created_at', { ascending: false }),
      supabase.from('facturas').select('*').order('vencimento', { ascending: true }),
    ])
    const err = fRes.error || factRes.error
    if (err) {
      setError(err.message)
    } else {
      setRegistos(((fRes.data as unknown as FinanceiroJoin[]) || []).map(toRow))
      setFacturas((factRes.data as Factura[]) || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let activo = true
    ;(async () => {
      const [fRes, factRes] = await Promise.all([
        supabase.from('financeiro').select(SELECT_FIN).order('created_at', { ascending: false }),
        supabase.from('facturas').select('*').order('vencimento', { ascending: true }),
      ])
      if (!activo) return
      const err = fRes.error || factRes.error
      if (err) {
        setError(err.message)
      } else {
        setRegistos(((fRes.data as unknown as FinanceiroJoin[]) || []).map(toRow))
        setFacturas((factRes.data as Factura[]) || [])
      }
      setLoading(false)
    })()
    return () => {
      activo = false
    }
  }, [supabase])

  // ── Registos financeiros ──────────────────────────────────
  const criarFinanceiro = useCallback(
    async (data: Partial<Financeiro>) => {
      const { data: novo, error: err } = await supabase
        .from('financeiro')
        .insert(data)
        .select(SELECT_FIN)
        .single()
      if (err) throw new Error(err.message)
      const row = toRow(novo as unknown as FinanceiroJoin)
      setRegistos(prev => [row, ...prev])
      return row
    },
    [supabase]
  )

  const actualizarFinanceiro = useCallback(
    async (id: string, data: Partial<Financeiro>) => {
      const { data: upd, error: err } = await supabase
        .from('financeiro')
        .update(data)
        .eq('id', id)
        .select(SELECT_FIN)
        .single()
      if (err) throw new Error(err.message)
      const row = toRow(upd as unknown as FinanceiroJoin)
      setRegistos(prev => prev.map(r => (r.id === id ? row : r)))
      return row
    },
    [supabase]
  )

  const eliminarFinanceiro = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from('financeiro').delete().eq('id', id)
      if (err) throw new Error(err.message)
      setRegistos(prev => prev.filter(r => r.id !== id))
      // as facturas ligadas caem por ON DELETE CASCADE — reflectir no estado local
      setFacturas(prev => prev.filter(f => f.financeiro_id !== id))
    },
    [supabase]
  )

  // ── Facturas ──────────────────────────────────────────────
  const criarFactura = useCallback(
    async (data: Partial<Factura>) => {
      const { data: novo, error: err } = await supabase.from('facturas').insert(data).select().single()
      if (err) throw new Error(err.message)
      setFacturas(prev =>
        [...prev, novo as Factura].sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      )
      return novo as Factura
    },
    [supabase]
  )

  const actualizarFactura = useCallback(
    async (id: string, data: Partial<Factura>) => {
      const { data: upd, error: err } = await supabase
        .from('facturas')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (err) throw new Error(err.message)
      setFacturas(prev => prev.map(f => (f.id === id ? (upd as Factura) : f)))
      return upd as Factura
    },
    [supabase]
  )

  // Atalho: mudar só o estado de uma factura (enviada/paga/vencida/cancelada).
  const mudarEstadoFactura = useCallback(
    async (id: string, estado: Factura['estado']) => {
      return actualizarFactura(id, { estado })
    },
    [actualizarFactura]
  )

  // ── Lembrete D-5 (invocação manual/provisória; cron definitivo é E4) ───────
  // Chama a função SQL `financeiro_lembretes_d5()` via RPC. Devolve o nº de
  // lembretes criados. Recarrega as facturas para reflectir a flag actualizada.
  const correrLembretesD5 = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('financeiro_lembretes_d5')
    if (err) throw new Error(err.message)
    await fetchAll()
    return (data as number) ?? 0
  }, [supabase, fetchAll])

  return {
    registos,
    facturas,
    loading,
    error,
    fetchAll,
    criarFinanceiro,
    actualizarFinanceiro,
    eliminarFinanceiro,
    criarFactura,
    actualizarFactura,
    mudarEstadoFactura,
    correrLembretesD5,
  }
}
