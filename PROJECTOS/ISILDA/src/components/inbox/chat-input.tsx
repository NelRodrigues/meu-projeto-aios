'use client'

import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  disabled?: boolean
  placeholder?: string
  onEnviar: (text: string) => void
}

export function ChatInput({ disabled = false, placeholder = 'Escreve uma mensagem...', onEnviar }: ChatInputProps) {
  const [texto, setTexto] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleEnviar = () => {
    const trimmed = texto.trim()
    if (!trimmed || disabled) return
    onEnviar(trimmed)
    setTexto('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTexto(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  return (
    <div className="px-4 py-3 border-t border-rose-100 bg-white">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors',
            disabled
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-gray-200'
          )}
        />
        <button
          onClick={handleEnviar}
          disabled={disabled || !texto.trim()}
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl transition-colors',
            disabled || !texto.trim()
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
