'use client'

import type { CalendarioDia } from '@/types/database'

interface DayCellProps {
  dia: CalendarioDia | null
  dayNumber: number
  isToday: boolean
  onClick?: (dia: CalendarioDia) => void
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  disponivel: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
    border: 'border-emerald-100',
  },
  quase_lotado: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    border: 'border-amber-100',
  },
  lotado: {
    bg: 'bg-red-50 hover:bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-400',
    border: 'border-red-100',
  },
  bloqueado: {
    bg: 'bg-gray-100',
    text: 'text-gray-400',
    dot: 'bg-gray-300',
    border: 'border-gray-100',
  },
  passado: {
    bg: 'bg-gray-50',
    text: 'text-gray-400',
    dot: 'bg-gray-200',
    border: 'border-gray-100',
  },
}

export function DayCell({ dia, dayNumber, isToday, onClick }: DayCellProps) {
  if (!dia) {
    return <div className="aspect-square rounded-xl" />
  }

  const style = STATUS_STYLES[dia.status] ?? STATUS_STYLES.passado
  const isClickable = dia.status !== 'passado' && onClick

  return (
    <div
      onClick={() => isClickable && onClick(dia)}
      className={`aspect-square rounded-xl border p-1.5 transition-all ${style.bg} ${style.border} ${
        isClickable ? 'cursor-pointer' : 'cursor-default'
      } ${isToday ? 'ring-2 ring-rose-400 ring-offset-1' : ''}`}
    >
      {/* Numero do dia */}
      <div className={`text-sm font-semibold ${isToday ? 'text-rose-600' : style.text}`}>
        {dayNumber}
      </div>

      {/* Contadores — visivel em telas maiores */}
      {dia.status !== 'passado' && (
        <div className="mt-auto hidden sm:block">
          {dia.status === 'bloqueado' ? (
            <div className="mt-1 text-xs text-gray-400">Folga</div>
          ) : (
            <div className={`mt-1 text-xs font-medium ${style.text}`}>
              {dia.pedidos_agendados}/{dia.capacidade_maxima}
            </div>
          )}
          {/* Mini barra de progresso */}
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/60">
            <div
              className={`h-full rounded-full ${style.dot}`}
              style={{
                width: dia.status === 'bloqueado' ? '100%' : `${Math.min(100, (dia.pedidos_agendados / dia.capacidade_maxima) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
