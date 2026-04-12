'use client'

import { cn } from '@/lib/utils'
import { Bot, Hand, AlertCircle } from 'lucide-react'
import type { ConversaActiva } from '@/types/database'

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

const MODO_CONFIG = {
  bot: { label: 'Bot', icon: Bot, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  humano: { label: 'Humano', icon: Hand, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  pausado: { label: 'Pausado', icon: AlertCircle, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
} as const

export function ConversationItem({ conversa, isSelected, onClick }: ConversationItemProps) {
  const modoKey = conversa.modo as keyof typeof MODO_CONFIG
  const modo = MODO_CONFIG[modoKey] || MODO_CONFIG.bot
  const ModoIcon = modo.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all border-b border-brand-50',
        isSelected
          ? 'bg-rose-50 border-l-2 border-l-rose-500'
          : 'hover:bg-rose-50/50 border-l-2 border-l-transparent'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shadow-sm flex-shrink-0',
        isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
      )}>
        {conversa.cliente_nome.charAt(0).toUpperCase()}
      </div>

      {/* Conteudo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-medium truncate', isSelected ? 'text-foreground' : 'text-gray-700')}>
            {conversa.cliente_nome}
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
