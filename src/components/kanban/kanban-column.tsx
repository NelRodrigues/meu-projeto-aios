'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { FASE_LABEL, type PipelineFase } from '@/lib/pipeline-fases'
import { KanbanCard } from './kanban-card'
import type { CandidaturaCartao } from '@/types/database'

interface KanbanColumnProps {
  fase: PipelineFase
  cartoes: CandidaturaCartao[]
}

export function KanbanColumn({ fase, cartoes }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: fase })

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          {FASE_LABEL[fase]}
        </h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          {cartoes.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors',
          isOver ? 'border-rose-400 bg-rose-50/60' : 'border-gray-200 bg-gray-50/50'
        )}
      >
        {cartoes.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-gray-300">Sem candidaturas</p>
        ) : (
          cartoes.map(c => <KanbanCard key={c.id} cartao={c} />)
        )}
      </div>
    </div>
  )
}
