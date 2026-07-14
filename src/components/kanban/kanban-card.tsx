'use client'

import { useRouter } from 'next/navigation'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Clock, AlertTriangle, GraduationCap, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isAtrasada, diasNaFase } from '@/lib/pipeline-atraso'
import type { CandidaturaCartao } from '@/types/database'

const TEMP_BADGE: Record<'quente' | 'morno' | 'frio', string> = {
  quente: 'bg-red-100 text-red-700',
  morno: 'bg-amber-100 text-amber-700',
  frio: 'bg-sky-100 text-sky-700',
}

const TEMP_LABEL: Record<'quente' | 'morno' | 'frio', string> = {
  quente: 'Quente',
  morno: 'Morno',
  frio: 'Frio',
}

function tempoEmFaseLabel(dias: number | null): string {
  if (dias == null) return '—'
  if (dias === 0) return 'hoje'
  return `${dias}d na fase`
}

export function KanbanCard({ cartao }: { cartao: CandidaturaCartao }) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cartao.id,
  })

  const atrasada = isAtrasada(cartao.fase_desde, cartao.prazo_fase_dias)
  const dias = diasNaFase(cartao.fase_desde)

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => router.push(`/clientes/${cartao.lead_id}`)}
      className={cn(
        'cursor-grab rounded-lg border bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
        atrasada ? 'border-red-300' : 'border-gray-200',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{cartao.lead_nome}</p>
        {cartao.lead_temperature && (
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              TEMP_BADGE[cartao.lead_temperature]
            )}
          >
            {TEMP_LABEL[cartao.lead_temperature]}
          </span>
        )}
      </div>

      {(cartao.programa_nome || cartao.destino_pais) && (
        <div className="mt-1.5 space-y-0.5 text-xs text-gray-500">
          {cartao.programa_nome && (
            <p className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3 shrink-0 text-rose-400" />
              <span className="truncate">{cartao.programa_nome}</span>
            </p>
          )}
          {cartao.destino_pais && (
            <p className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0 text-rose-400" />
              {cartao.destino_pais}
            </p>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span
          className={cn(
            'flex items-center gap-1 text-[11px]',
            atrasada ? 'text-red-600' : 'text-gray-400'
          )}
        >
          <Clock className="h-3 w-3" />
          {tempoEmFaseLabel(dias)}
        </span>
        {atrasada && (
          <span className="flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
            <AlertTriangle className="h-3 w-3" />
            Atrasada
          </span>
        )}
      </div>
    </div>
  )
}
