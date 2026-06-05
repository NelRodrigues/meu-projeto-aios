'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSharedBackendMode } from '@/lib/backend/config'
import { buildSharedInboxMessages, type SharedContactRow, type SharedDealRow } from '@/lib/backend/shared-mappers'
import type { MensagemWhatsApp } from '@/types/database'

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

      Promise.all([
        supabase
          .from('contacts')
          .select('id,created_at,updated_at,nome,telefone,email,estagio,origem,notas,valor_total_pago,whatsapp_id')
          .eq('id', clienteId)
          .maybeSingle(),
        supabase
          .from('deals')
          .select('id,lead_id,title,status,total_paid,created_at,updated_at,expected_close_date,notes,payment_status,leads!lead_id(name,phone)')
          .eq('lead_id', clienteId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]).then(([contactResult, dealResult]) => {
        if (!activo) return
        if (contactResult.error) {
          console.error('[use-messages] Erro shared contact:', contactResult.error.message)
          setMensagens([])
        } else {
          const contact = contactResult.data as SharedContactRow | null
          const deal = (dealResult.data as SharedDealRow | null) || null
          setMensagens(contact ? buildSharedInboxMessages(contact, deal) : [])
        }
        setLoading(false)
      })
      return () => {
        activo = false
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
