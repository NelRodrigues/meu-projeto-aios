'use client'

import { cn } from '@/lib/utils'
import { Bot, Hand, Clock, PhoneForwarded, CheckCircle2 } from 'lucide-react'
import type { ConversaActiva, ConversationStatus } from '@/types/database'

interface ConversationItemProps {
  conversa: ConversaActiva
  isSelected: boolean
  onClick: () => void
}

function tempoRelativo(data: string | null): string {
  if (!data) return ''
  const diff = Date.now() - new Date(data).getTime()
  const minutos = Math.floor(diff / 60000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `ha ${minutos}m`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `ha ${horas}h`
  const dias = Math.floor(horas / 24)
  if (dias < 30) return `ha ${dias}d`
  return `ha ${Math.floor(dias / 30)}mes`
}

function truncar(texto: string | null, max: number): string {
  if (!texto) return 'Sem mensagens'
  if (texto.startsWith('{') && texto.includes('"mediaKey"')) return '📷 Midia'
  if (texto.length <= max) return texto
  return texto.slice(0, max) + '...'
}

// Badge por ESTADO real (os 5 valores do enum), rótulos pt-AO óbvios para a
// Ana e o Rinaldo (não-técnicos). AC1: estado do agente sempre visível.
const ESTADO_CONFIG: Record<ConversationStatus, { label: string; icon: typeof Bot; bg: string; text: string; border: string }> = {
  active: { label: 'IA activa', icon: Bot, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  paused_by_human: { label: 'Assumida', icon: Hand, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  transferred: { label: 'Transferida', icon: PhoneForwarded, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  paused_by_schedule: { label: 'Fora de horas', icon: Clock, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  completed: { label: 'Concluída', icon: CheckCircle2, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
}

export function ConversationItem({ conversa, isSelected, onClick }: ConversationItemProps) {
  const modo = ESTADO_CONFIG[conversa.estado] ?? ESTADO_CONFIG.active
  const ModoIcon = modo.icon
  // AC5: conversas transferidas destacadas para triagem rápida.
  const isTransferida = conversa.estado === 'transferred'
  const nomeCliente = conversa.cliente_nome || 'Cliente sem nome'
  const avatar = nomeCliente.charAt(0).toUpperCase()

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all border-b border-brand-50',
        isSelected
          ? 'bg-rose-50 border-l-2 border-l-rose-500'
          : isTransferida
            ? 'bg-orange-50/60 border-l-2 border-l-orange-400 hover:bg-orange-50'
            : 'hover:bg-rose-50/50 border-l-2 border-l-transparent'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shadow-sm flex-shrink-0',
        isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
      )}>
        {avatar}
      </div>

      {/* Conteudo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-medium truncate', isSelected ? 'text-foreground' : 'text-gray-700')}>
            {nomeCliente}
          </span>
          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
            {tempoRelativo(conversa.ultima_mensagem_em)}
          </span>
        </div>

        {conversa.telefone && (
          <span className="text-[10px] text-gray-400 block">
            {conversa.telefone.length > 12
              ? conversa.telefone.slice(0, 6) + '...' + conversa.telefone.slice(-4)
              : conversa.telefone}
          </span>
        )}

        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500 truncate flex-1 mr-2">
            {conversa.ultimo_remetente === 'bot' && <span className="text-emerald-600">IA: </span>}
            {conversa.ultimo_remetente === 'humano' && <span className="text-blue-600">Isi: </span>}
            {truncar(conversa.ultima_mensagem, 50)}
          </p>

          <span className={cn(
            'flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0',
            modo.bg, modo.text, modo.border
          )}>
            <ModoIcon className="h-2.5 w-2.5" />
            {modo.label}
          </span>
        </div>
      </div>
    </button>
  )
}
