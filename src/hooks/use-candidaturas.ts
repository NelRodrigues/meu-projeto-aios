'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CandidaturaCartao, PipelineFase } from '@/types/database'

// ============================================================
// Hook do kanban de candidaturas (story 2.3).
// Segue o padrão de use-catalogo/use-conversations: browser client, setState só
// em callbacks, Realtime via postgres_changes. Traz as candidaturas com o lead,
// programa e destino embebidos (join), para o cartão ter tudo sem N+1.
//
// Mover fase: só faz UPDATE de `fase`. O trigger 017 trata fase_desde, auditoria
// (mudancas_estagio) e espelhamento (leads.pipeline_fase) — o frontend não os toca.
// ============================================================

// Shape do join aninhado que o Supabase devolve (leads/programas/destinos).
interface CandidaturaRow {
  id: string
  created_at: string
  updated_at: string
  lead_id: string
  ficha_id: string | null
  programa_id: string | null
  parceiro_id: string | null
  fase: PipelineFase
  fase_desde: string | null
  prazo_fase_dias: number | null
  estado_documental: string | null
  notas: string | null
  leads: { nome: string | null; temperature: 'quente' | 'morno' | 'frio' | null } | null
  programas: { nome: string | null; destinos: { pais: string | null } | null } | null
}

const SELECT_CARTAO =
  '*, leads:lead_id(nome, temperature), programas:programa_id(nome, destinos:destino_id(pais))'

function toCartao(row: CandidaturaRow): CandidaturaCartao {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    lead_id: row.lead_id,
    ficha_id: row.ficha_id,
    programa_id: row.programa_id,
    parceiro_id: row.parceiro_id,
    fase: row.fase,
    fase_desde: row.fase_desde,
    prazo_fase_dias: row.prazo_fase_dias,
    estado_documental: row.estado_documental,
    notas: row.notas,
    lead_nome: row.leads?.nome ?? 'Sem nome',
    lead_temperature: row.leads?.temperature ?? null,
    programa_nome: row.programas?.nome ?? null,
    destino_pais: row.programas?.destinos?.pais ?? null,
  }
}

export function useCandidaturas() {
  const supabase = useMemo(() => createClient(), [])
  const [candidaturas, setCandidaturas] = useState<CandidaturaCartao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('candidaturas')
      .select(SELECT_CARTAO)
      .order('fase_desde', { ascending: true, nullsFirst: true })
    if (err) {
      setError(err.message)
    } else {
      setError(null)
      setCandidaturas(((data as unknown as CandidaturaRow[]) || []).map(toCartao))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let activo = true
    supabase
      .from('candidaturas')
      .select(SELECT_CARTAO)
      .order('fase_desde', { ascending: true, nullsFirst: true })
      .then(({ data, error: err }) => {
        if (!activo) return
        if (err) {
          setError(err.message)
        } else {
          setCandidaturas(((data as unknown as CandidaturaRow[]) || []).map(toCartao))
        }
        setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [supabase])

  // Realtime: qualquer INSERT/UPDATE/DELETE em candidaturas recarrega a vista
  // (inclui mudanças feitas por outros utilizadores ou pelo agente E3).
  useEffect(() => {
    const channel = supabase
      .channel('kanban-candidaturas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidaturas' }, () => {
        void fetchAll()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchAll])

  // Mover uma candidatura para uma nova fase. Optimista: actualiza local já,
  // reverte se a base recusar. Só escreve `fase` — o trigger 017 faz o resto.
  const moverFase = useCallback(
    async (id: string, novaFase: PipelineFase) => {
      const anterior = candidaturas.find(c => c.id === id)
      if (!anterior || anterior.fase === novaFase) return

      setCandidaturas(prev => prev.map(c => (c.id === id ? { ...c, fase: novaFase } : c)))

      const { error: err } = await supabase
        .from('candidaturas')
        .update({ fase: novaFase })
        .eq('id', id)

      if (err) {
        // reverte o movimento optimista
        setCandidaturas(prev => prev.map(c => (c.id === id ? anterior : c)))
        setError(err.message)
      }
    },
    [supabase, candidaturas]
  )

  return { candidaturas, loading, error, fetchAll, moverFase }
}
