'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MensagemWhatsApp } from '@/types/database'

// Mensagens vivem na tabela `mensagens_whatsapp` (migracao 002), com `lead_id`.
export function useMessages(leadId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const [mensagens, setMensagens] = useState<MensagemWhatsApp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true

    if (!leadId) {
      // Reset em microtask para nao chamar setState sincronamente no effect.
      Promise.resolve().then(() => {
        if (!activo) return
        setMensagens([])
        setLoading(false)
      })
      return () => {
        activo = false
      }
    }

    // setState corre dentro do .then (nunca no corpo sincrono do effect).
    supabase
      .from('mensagens_whatsapp')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!activo) return
        if (error) {
          console.error('[use-messages] Erro:', error.message)
        } else {
          setMensagens(data || [])
        }
        setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [supabase, leadId])

  // Realtime: novas mensagens e actualizacoes de status
  useEffect(() => {
    if (!leadId) return

    const channel = supabase
      .channel(`mensagens-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp', filter: `lead_id=eq.${leadId}` },
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
        { event: 'UPDATE', schema: 'public', table: 'mensagens_whatsapp', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          setMensagens(prev =>
            prev.map(msg => msg.id === (payload.new as MensagemWhatsApp).id ? (payload.new as MensagemWhatsApp) : msg)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, leadId])

  const enviarMensagem = useCallback(async (text: string) => {
    if (!leadId) throw new Error('Lead nao definido')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) throw new Error('Nao autenticado')

    const res = await fetch(`${supabaseUrl}/functions/v1/uazapi-send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ lead_id: leadId, message: text }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(data.error || 'Falha ao enviar mensagem')
    }
  }, [supabase, leadId])

  return { mensagens, loading, enviarMensagem }
}
