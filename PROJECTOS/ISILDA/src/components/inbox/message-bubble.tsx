'use client'

import { cn } from '@/lib/utils'
import { Check, CheckCheck, Clock, XCircle, Image, Video, Music, FileText, MapPin, User, ExternalLink } from 'lucide-react'
import type { MensagemWhatsApp } from '@/types/database'

function MediaContent({ mediaType, mediaUrl, isIncoming }: {
  mediaType: string | null
  mediaUrl: string | null
  isIncoming: boolean
}) {
  const iconColor = isIncoming ? 'text-gray-400' : 'text-current opacity-60'

  if (mediaType === 'image') {
    if (mediaUrl) {
      return (
        <div className="relative">
          <img src={mediaUrl} alt="Imagem" className="max-w-full rounded-t-2xl object-cover max-h-64" />
        </div>
      )
    }
    return (
      <div className={cn('flex items-center gap-2 px-4 py-4', iconColor)}>
        <Image className="h-5 w-5" />
        <span className="text-sm">Imagem</span>
      </div>
    )
  }

  if (mediaType === 'video') {
    return (
      <div className={cn('flex items-center gap-2 px-4 py-4', iconColor)}>
        <Video className="h-5 w-5" />
        <span className="text-sm">Video</span>
        {mediaUrl && (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    )
  }

  if (mediaType === 'audio') {
    if (mediaUrl) {
      return (
        <div className="px-3 pt-3">
          <audio controls className="w-full h-10" preload="none">
            <source src={mediaUrl} />
          </audio>
        </div>
      )
    }
    return (
      <div className={cn('flex items-center gap-2 px-4 py-4', iconColor)}>
        <Music className="h-5 w-5" />
        <span className="text-sm">Audio</span>
      </div>
    )
  }

  if (mediaType === 'document') {
    return (
      <div className={cn('flex items-center gap-2 px-4 py-4', iconColor)}>
        <FileText className="h-5 w-5" />
        <span className="text-sm">Documento</span>
        {mediaUrl && (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    )
  }

  if (mediaType === 'location') {
    return (
      <div className={cn('flex items-center gap-2 px-4 py-4', iconColor)}>
        <MapPin className="h-5 w-5" />
        <span className="text-sm">Localizacao</span>
      </div>
    )
  }

  if (mediaType === 'contact') {
    return (
      <div className={cn('flex items-center gap-2 px-4 py-4', iconColor)}>
        <User className="h-5 w-5" />
        <span className="text-sm">Contacto partilhado</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 px-4 py-4', iconColor)}>
      <FileText className="h-5 w-5" />
      <span className="text-sm">Midia</span>
    </div>
  )
}

function StatusIcon({ status, isIncoming }: { status: string | null; isIncoming: boolean }) {
  if (isIncoming) return null
  switch (status) {
    case 'read': return <CheckCheck className="h-3 w-3 text-blue-400" />
    case 'delivered': return <CheckCheck className="h-3 w-3" />
    case 'sent': return <Check className="h-3 w-3" />
    case 'failed': return <XCircle className="h-3 w-3 text-red-400" />
    default: return <Clock className="h-3 w-3" />
  }
}

export function MessageBubble({ message }: { message: MensagemWhatsApp }) {
  const isIncoming = message.direction === 'incoming'
  const isSystem = message.direction === 'internal' || message.sender_type === 'sistema'
  const isBot = message.sender_type === 'bot'
  const isHumano = message.sender_type === 'humano'

  const hasMedia = !!message.media_type
  const displayText = message.conteudo

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-rose-50 text-gray-500 text-[11px] px-4 py-1.5 rounded-full border border-rose-100 max-w-[80%] text-center">
          {message.conteudo}
        </div>
      </div>
    )
  }

  const time = new Date(message.created_at).toLocaleTimeString('pt-AO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Luanda',
  })

  const senderLabel = isIncoming ? 'Cliente' : isBot ? 'IA' : 'Isi'
  const senderColor = isIncoming ? 'text-gray-500' : isBot ? 'text-emerald-600' : 'text-blue-600'

  return (
    <div className={cn('flex mb-3', isIncoming ? 'justify-start' : 'justify-end')}>
      <div className="max-w-[70%]">
        <div className={cn('text-[10px] font-medium mb-0.5 px-1', senderColor, isIncoming ? 'text-left' : 'text-right')}>
          {senderLabel}
        </div>

        <div className={cn(
          'rounded-2xl shadow-sm overflow-hidden',
          hasMedia ? 'p-0' : 'px-4 py-2.5',
          isIncoming
            ? 'bg-white text-foreground rounded-tl-sm border border-rose-100'
            : isBot
              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900 rounded-tr-sm border border-emerald-200'
              : 'bg-rose-500 text-white rounded-tr-sm'
        )}>
          {hasMedia && (
            <MediaContent mediaType={message.media_type} mediaUrl={message.media_url} isIncoming={isIncoming} />
          )}

          <div className={cn(hasMedia ? 'px-3 py-2' : '')}>
            {displayText && (
              <p className="text-sm whitespace-pre-wrap break-words">{displayText}</p>
            )}

            <div className="flex items-center justify-end gap-1.5 mt-1">
              <span className={cn(
                'text-[10px]',
                isIncoming ? 'text-gray-400' : isBot ? 'text-emerald-500' : 'text-white/70'
              )}>
                {time}
              </span>
              {!isIncoming && (
                <span className={cn('text-[10px]', isBot ? 'text-emerald-500' : 'text-white/70')}>
                  <StatusIcon status={message.message_status} isIncoming={isIncoming} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
