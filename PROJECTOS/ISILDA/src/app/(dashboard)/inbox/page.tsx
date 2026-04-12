'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConversationList } from '@/components/inbox/conversation-list'
import { ChatArea } from '@/components/inbox/chat-area'
import { ClientSidebar } from '@/components/inbox/client-sidebar'
import { useConversations } from '@/hooks/use-conversations'
import { useMessages } from '@/hooks/use-messages'
import type { ConversaActiva } from '@/types/database'

export default function InboxPage() {
  const {
    conversas,
    loading,
    filtro,
    setFiltro,
    search,
    setSearch,
    hasMore,
    loadMore,
    pendentesCount,
    assumirConversa,
    devolverAoBot,
  } = useConversations()

  const [selected, setSelected] = useState<ConversaActiva | null>(null)
  const [showChat, setShowChat] = useState(false)

  const { mensagens, loading: loadingMsgs, enviarMensagem } = useMessages(selected?.cliente_id || null)

  const handleSelect = (conv: ConversaActiva) => {
    setSelected(conv)
    setShowChat(true)
  }

  const handleBack = () => {
    setShowChat(false)
    setSelected(null)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden m-4 lg:m-6 rounded-xl border border-rose-100 shadow-sm bg-white">
      {/* Painel Esquerdo — Lista de Conversas */}
      <div className={cn(
        'w-full md:w-80 flex-shrink-0 border-r border-rose-100 flex flex-col',
        showChat && 'hidden md:flex'
      )}>
        <ConversationList
          conversas={conversas}
          loading={loading}
          selected={selected}
          filtro={filtro}
          search={search}
          hasMore={hasMore}
          pendentesCount={pendentesCount}
          onSelect={handleSelect}
          onFiltroChange={setFiltro}
          onSearchChange={setSearch}
          onLoadMore={loadMore}
        />
      </div>

      {/* Painel Central — Chat */}
      <div className={cn('flex-1 flex flex-col min-w-0', !showChat && 'hidden md:flex')}>
        {selected ? (
          <ChatArea
            conversa={selected}
            mensagens={mensagens}
            loading={loadingMsgs}
            onEnviar={enviarMensagem}
            onAssumir={async () => {
              await assumirConversa(selected.conversa_id)
              setSelected({ ...selected, modo: 'humano', estado: 'paused_by_human' })
            }}
            onDevolver={async () => {
              await devolverAoBot(selected.conversa_id)
              setSelected({ ...selected, modo: 'bot', estado: 'active' })
            }}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-8 w-8 text-rose-400" />
              </div>
              <p className="text-sm text-gray-500">Selecciona uma conversa para comecar</p>
            </div>
          </div>
        )}
      </div>

      {/* Painel Direito — Info do Cliente (xl+) */}
      {selected && (
        <div className="hidden xl:flex w-72 flex-shrink-0 border-l border-rose-100 flex-col">
          <ClientSidebar conversa={selected} />
        </div>
      )}
    </div>
  )
}
