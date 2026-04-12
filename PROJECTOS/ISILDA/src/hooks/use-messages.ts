'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MensagemWhatsApp } from '@/types/database'

export function useMessages(clienteId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const [mensagens, setMensagens] = useState<MensagemWhatsApp[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMensagens = useCallback(async () => {
    if (!clienteId) {
      setMensagens([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('mensagens_whatsapp')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[use-messages] Erro:', error.message)
    } else {
      setMensagens(data || [])
    }

    setLoading(false)
  }, [supabase, clienteId])

  useEffect(() => {
    fetchMensagens()
  }, [fetchMensagens])

  // Realtime: novas mensagens e actualizacoes de status
  useEffect(() => {
    if (!clienteId) return

    const channel = supabase
      .channel(`mensagens-${clienteId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp', filter: `cliente_id=eq.${clienteId}` },
        (payload) => {
          setMensagens(prev => {
            const newMsg = payload.new as MensagemWhatsApp
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mensagens_whatsapp', filter: `cliente_id=eq.${clienteId}` },
        (payload) => {
          setMensagens(prev =>
            prev.map(msg => msg.id === (payload.new as MensagemWhatsApp).id ? (payload.new as MensagemWhatsApp) : msg)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, clienteId])

  const enviarMensagem = useCallback(async (text: string) => {
    if (!clienteId) throw new Error('Cliente nao definido')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) throw new Error('Nao autenticado')

    const res = await fetch(`${supabaseUrl}/functions/v1/uazapi-send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ cliente_id: clienteId, message: text }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(data.error || 'Falha ao enviar mensagem')
    }
  }, [supabase, clienteId])

  return { mensagens, loading, enviarMensagem }
}
