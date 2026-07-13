'use client'

import { useMemo } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { KanbanSquare, AlertCircle } from 'lucide-react'
import { useCandidaturas } from '@/hooks/use-candidaturas'
import { PIPELINE_FASES, type PipelineFase } from '@/lib/pipeline-fases'
import { KanbanColumn } from '@/components/kanban/kanban-column'
import type { CandidaturaCartao } from '@/types/database'

const FASES_SET = new Set<string>(PIPELINE_FASES)

export default function KanbanPage() {
  const { candidaturas, loading, error, moverFase } = useCandidaturas()

  // Requer um pequeno arrasto antes de activar o drag, para o clique (navegar
  // para a ficha) continuar a funcionar.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const porFase = useMemo(() => {
    const map: Record<PipelineFase, CandidaturaCartao[]> = {
      lead: [],
      qualificado: [],
      consulta_agendada: [],
      proposta_enviada: [],
      formalizacao_pagamento: [],
      candidatura_submetida: [],
      em_curso: [],
      concluido: [],
    }
    for (const c of candidaturas) {
      if (map[c.fase]) map[c.fase].push(c)
    }
    return map
  }, [candidaturas])

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const novaFase = String(over.id)
    if (!FASES_SET.has(novaFase)) return
    void moverFase(String(active.id), novaFase as PipelineFase)
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <KanbanSquare className="h-6 w-6 text-rose-500" />
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500">
            {candidaturas.length} candidatura{candidaturas.length !== 1 ? 's' : ''} · arrasta um
            cartão para mudar de fase
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">A carregar pipeline…</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
            {PIPELINE_FASES.map(fase => (
              <KanbanColumn key={fase} fase={fase} cartoes={porFase[fase]} />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  )
}
