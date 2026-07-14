'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ============================================================
// Hook RFV + 80/20 (story 2.7).
// Segue o padrão de use-financeiro: browser client, setState só em callbacks.
//
// ⚠ Acesso só-admin: as materialized views `v_rfv_leads`/`v_destinos_receita`
// têm REVOKE para authenticated (migração 026). NÃO se faz SELECT directo — lê-se
// SEMPRE via as funções wrapper SECURITY DEFINER que verificam admin:
//   supabase.rpc('get_rfv_leads')        → matriz RFV por lead
//   supabase.rpc('get_destinos_receita') → receita/Pareto por destino
//   supabase.rpc('get_rfv_last_refresh') → data do último refresh (UI mostra-a)
// Um utilizador de `operacao` recebe erro 42501 (RAISE) — a UI mostra o aviso.
//
// O refresh das views NÃO é feito por este hook (é operação service_role): passa
// pela rota admin `/api/rfv/refresh`, que corre `refresh_rfv()`.
// ============================================================

export type RfvSegmento = 'novo' | 'campeao' | 'em_risco' | 'inactivo' | 'regular'

export interface RfvLead {
  lead_id: string
  lead_nome: string
  estagio: string | null
  ultima_actividade: string
  recencia_dias: number
  n_candidaturas: number
  valor_aoa: number
  r_score: number
  f_score: number
  v_score: number
  segmento: RfvSegmento
}

export interface DestinoReceita {
  destino_id: string
  pais: string
  cidade: string | null
  receita_aoa: number
  n_registos: number
  pct_receita: number
  pct_acumulada: number
}

export function useRfv() {
  const supabase = useMemo(() => createClient(), [])
  const [leads, setLeads] = useState<RfvLead[]>([])
  const [destinos, setDestinos] = useState<DestinoReceita[]>([])
  const [ultimoRefresh, setUltimoRefresh] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [rfvRes, destRes, refreshRes] = await Promise.all([
      supabase.rpc('get_rfv_leads'),
      supabase.rpc('get_destinos_receita'),
      supabase.rpc('get_rfv_last_refresh'),
    ])
    const err = rfvRes.error || destRes.error || refreshRes.error
    if (err) {
      setError(err.message)
    } else {
      setLeads((rfvRes.data as RfvLead[]) || [])
      setDestinos((destRes.data as DestinoReceita[]) || [])
      setUltimoRefresh((refreshRes.data as string | null) ?? null)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let activo = true
    ;(async () => {
      const [rfvRes, destRes, refreshRes] = await Promise.all([
        supabase.rpc('get_rfv_leads'),
        supabase.rpc('get_destinos_receita'),
        supabase.rpc('get_rfv_last_refresh'),
      ])
      if (!activo) return
      const err = rfvRes.error || destRes.error || refreshRes.error
      if (err) {
        setError(err.message)
      } else {
        setLeads((rfvRes.data as RfvLead[]) || [])
        setDestinos((destRes.data as DestinoReceita[]) || [])
        setUltimoRefresh((refreshRes.data as string | null) ?? null)
      }
      setLoading(false)
    })()
    return () => {
      activo = false
    }
  }, [supabase])

  // Refresh manual via rota admin (service_role corre `refresh_rfv`). Depois
  // recarrega os dados das views já refrescadas.
  const refrescar = useCallback(async () => {
    const res = await fetch('/api/rfv/refresh', { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error || 'Falha ao refrescar o RFV.')
    }
    await fetchAll()
    const body = await res.json().catch(() => ({}))
    return (body?.refreshed_at as string | undefined) ?? null
  }, [fetchAll])

  return { leads, destinos, ultimoRefresh, loading, error, fetchAll, refrescar }
}
