'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ArrowLeft, Bot, Hand } from 'lucide-react'
import { MessageBubble } from './message-bubble'
import { ChatInput } from './chat-input'
import type { ConversaActiva, ConversationStatus, MensagemWhatsApp } from '@/types/database'

interface ChatAreaProps {
  conversa: ConversaActiva
  mensagens: MensagemWhatsApp[]
  loading: boolean
  onEnviar: (text: string) => Promise<void> | void
  onAssumir: () => void
  onDevolver: () => void
  onBack: () => void
  readOnly?: boolean
}

// Badge por ESTADO real (os 5 do enum) — rótulos pt-AO óbvios (AC1).
function ModoBadge({ estado }: { estado: ConversationStatus }) {
  const config: Record<ConversationStatus, { label: string; bg: string; text: string }> = {
    active: { label: 'IA activa', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    paused_by_human: { label: 'Assumida', bg: 'bg-blue-100', text: 'text-blue-700' },
    transferred: { label: 'Transferida', bg: 'bg-orange-100', text: 'text-orange-700' },
    paused_by_schedule: { label: 'Fora de horas', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    completed: { label: 'Concluída', bg: 'bg-gray-100', text: 'text-gray-600' },
  }
  const c = config[estado] || config.active
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', c.bg, c.text)}>
      {c.label}
    </span>
  )
}

export function ChatArea({ conversa, mensagens, loading, onEnviar, onAssumir, onDevolver, onBack, readOnly = false }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isBotMode = conversa.modo === 'bot'
  const nomeCliente = conversa.cliente_nome || 'Cliente sem nome'
  const avatar = nomeCliente.charAt(0).toUpperCase()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-rose-100 bg-white">
        <button onClick={onBack} className="md:hidden flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-sm font-semibold text-rose-700 flex-shrink-0">
          {avatar}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{nomeCliente}</span>
            <ModoBadge estado={conversa.estado} />
          </div>
          {conversa.telefone && (
            <span className="text-[11px] text-gray-400">{conversa.telefone}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {readOnly ? (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              Modo leitura
            </span>
          ) : isBotMode ? (
            <button
              onClick={onAssumir}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <Hand className="h-3.5 w-3.5" />
              Assumir
            </button>
          ) : (
            <button
              onClick={onDevolver}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
            >
              <Bot className="h-3.5 w-3.5" />
              Devolver ao Bot
            </button>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-rose-50/20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-gray-400 text-sm">A carregar mensagens...</div>
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          mensagens.map(msg => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Indicador modo bot */}
      {isBotMode && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 border-t border-emerald-200">
          <Bot className="h-4 w-4 text-emerald-600" />
          <span className="text-xs text-emerald-700 font-medium">
            Modo Bot activo — a Isi IA esta a responder automaticamente
          </span>
        </div>
      )}

      {/* Input */}
      <ChatInput
        disabled={readOnly}
        placeholder={readOnly ? 'Modo leitura — envio ainda não ligado ao backend partilhado.' : 'Escreve uma mensagem e envia.'}
        onEnviar={onEnviar}
      />
    </div>
  )
}
