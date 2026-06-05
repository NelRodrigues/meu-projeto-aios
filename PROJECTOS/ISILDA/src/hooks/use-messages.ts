'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSharedBackendMode, PUBLIC_SHARED_TENANT_ID } from '@/lib/backend/config'
import type { MensagemWhatsApp, WhatsAppDirection, WhatsAppSenderType, WhatsAppMessageStatus } from '@/types/database'

// Linha bruta de public.whatsapp_messages (backend partilhado SIC).
interface SharedWhatsAppMessageRow {
  id: string
  created_at: string
  contact_id: string | null
  content: string | null
  message: string | null
  direction: string | null
  sender_type: string | null
  status: string | null
  message_id: string | null
  media_url: string | null
  message_type: string | null
}

// Mapeia whatsapp_messages (shared) para o contrato MensagemWhatsApp do inbox.
function mapSharedWhatsAppMessage(row: SharedWhatsAppMessageRow): MensagemWhatsApp {
  const direction: WhatsAppDirection = row.direction === 'outgoing' ? 'outgoing' : 'incoming'
  let sender: WhatsAppSenderType = direction === 'outgoing' ? 'bot' : 'cliente'
  if (row.sender_type === 'humano' || row.sender_type === 'human') sender = 'humano'
  else if (row.sender_type === 'sistema' || row.sender_type === 'system') sender = 'sistema'
  else if (row.sender_type === 'bot') sender = 'bot'
  else if (row.sender_type === 'cliente') sender = 'cliente'
  const status: WhatsAppMessageStatus =
    row.status === 'read' ? 'read'
    : row.status === 'delivered' ? 'delivered'
    : row.status === 'received' ? 'delivered'
    : 'sent'
  return {
    id: row.id,
    created_at: row.created_at,
    cliente_id: row.contact_id || '',
    sender_type: sender,
    conteudo: row.content || row.message || '',
    direction,
    message_status: status,
    whatsapp_message_id: row.message_id,
    media_url: row.media_url,
    media_type: row.message_type && row.message_type !== 'text' ? row.message_type : null,
    intencao_classificada: null,
    confianca_resposta: null,
    modelo_llm: null,
    tokens_input: null,
    tokens_output: null,
    latencia_ms: null,
  }
}

const SHARED_WM_COLUMNS = 'id,created_at,contact_id,content,message,direction,sender_type,status,message_id,media_url,message_type'

export function useMessages(clienteId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const sharedMode = isSharedBackendMode()
  const [mensagens, setMensagens] = useState<MensagemWhatsApp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true

    if (sharedMode) {
      if (!clienteId) {
        Promise.resolve().then(() => {
          if (!activo) return
          setMensagens([])
          setLoading(false)
        })
        return () => {
          activo = false
        }
      }

      let query = supabase
        .from('whatsapp_messages')
        .select(SHARED_WM_COLUMNS)
        .eq('contact_id', clienteId)
        .order('created_at', { ascending: true })
      if (PUBLIC_SHARED_TENANT_ID) {
        query = query.eq('tenant_id', PUBLIC_SHARED_TENANT_ID)
      }

      query.then(({ data, error }) => {
        if (!activo) return
        if (error) {
          console.error('[use-messages] Erro shared whatsapp_messages:', error.message)
          setMensagens([])
        } else {
          setMensagens((data as SharedWhatsAppMessageRow[] | null)?.map(mapSharedWhatsAppMessage) || [])
        }
        setLoading(false)
      })

      // Realtime: novas mensagens do backend partilhado.
      const channel = supabase
        .channel(`shared-wm-${clienteId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `contact_id=eq.${clienteId}` },
          (payload) => {
            const novo = mapSharedWhatsAppMessage(payload.new as SharedWhatsAppMessageRow)
            setMensagens((prev) => (prev.some((m) => m.id === novo.id) ? prev : [...prev, novo]))
          }
        )
        .subscribe()

      return () => {
        activo = false
        supabase.removeChannel(channel)
      }
    }

    if (!clienteId) {
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
      .eq('cliente_id', clienteId)
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
  }, [supabase, clienteId, sharedMode])

  // Realtime: novas mensagens e actualizacoes de status
  useEffect(() => {
    if (sharedMode) return
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
  }, [supabase, clienteId, sharedMode])

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

    if (sharedMode) {
      const now = new Date().toISOString()
      setMensagens(prev => [
        ...prev,
        {
          id: `temp-${now}`,
          created_at: now,
          cliente_id: clienteId,
          sender_type: 'humano',
          conteudo: text,
          direction: 'outgoing',
          message_status: 'sent',
          whatsapp_message_id: null,
          media_url: null,
          media_type: null,
          intencao_classificada: null,
          confianca_resposta: null,
          modelo_llm: null,
          tokens_input: null,
          tokens_output: null,
          latencia_ms: null,
        },
      ])
    }
  }, [sharedMode, supabase, clienteId])

  return { mensagens, loading, enviarMensagem }
}
