'use client'

import { cn } from '@/lib/utils'
import { Bell, AlertCircle, DollarSign, Clock, RefreshCw, Zap, Settings } from 'lucide-react'
import type { Notificacao, NotificacaoTipo } from '@/types/database'

interface NotificationListProps {
  notificacoes: Notificacao[]
  loading: boolean
  naoLidas: number
  onMarcarLida: (id: string) => void
  onMarcarTodasLidas: () => void
  onClose: () => void
}

const TIPO_CONFIG: Record<NotificacaoTipo, { icon: React.ElementType; color: string; label: string }> = {
  takeover: { icon: AlertCircle, color: 'text-orange-500', label: 'Takeover' },
  pagamento: { icon: DollarSign, color: 'text-emerald-500', label: 'Pagamento' },
  urgente: { icon: Zap, color: 'text-red-500', label: 'Urgente' },
  conflito_calendario: { icon: Clock, color: 'text-blue-500', label: 'Calendario' },
  recompra: { icon: RefreshCw, color: 'text-purple-500', label: 'Recompra' },
  sistema: { icon: Settings, color: 'text-gray-500', label: 'Sistema' },
}

function tempoRelativo(data: string): string {
  const diff = Date.now() - new Date(data).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function NotificationList({
  notificacoes,
  loading,
  naoLidas,
  onMarcarLida,
  onMarcarTodasLidas,
  onClose,
}: NotificationListProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-800">Notificacoes</span>
          {naoLidas > 0 && (
            <span className="bg-rose-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {naoLidas}
            </span>
          )}
        </div>
        {naoLidas > 0 && (
          <button
            onClick={onMarcarTodasLidas}
            className="text-xs text-rose-500 hover:text-rose-600 font-medium"
          >
            Marcar todas lidas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-400 animate-pulse">A carregar...</div>
        ) : notificacoes.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            Sem notificacoes
          </div>
        ) : (
          notificacoes.map(n => {
            const tipoKey = n.tipo as NotificacaoTipo
            const config = TIPO_CONFIG[tipoKey] || TIPO_CONFIG.sistema
            const Icon = config.icon

            return (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.lida) onMarcarLida(n.id)
                  onClose()
                }}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 hover:bg-gray-50',
                  !n.lida && 'bg-rose-50/50'
                )}
              >
                <div className={cn('flex-shrink-0 mt-0.5', config.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500">{config.label}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{tempoRelativo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{n.mensagem}</p>
                </div>
                {!n.lida && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-rose-500 mt-1.5" />
                )}
              </button>
            )
          })
        )}
      </div>
    </>
  )
}
