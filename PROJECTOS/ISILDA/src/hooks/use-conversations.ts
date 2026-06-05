'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSharedBackendMode, PUBLIC_SHARED_TENANT_ID } from '@/lib/backend/config'
import {
  mapSharedContactToConversa,
  type SharedContactRow,
  type SharedDealRow,
} from '@/lib/backend/shared-mappers'
import type { ConversaActiva, ConversationStatus, WhatsAppSenderType } from '@/types/database'

type FiltroModo = 'todas' | 'bot' | 'humano' | 'pendentes'

const PAGE_SIZE = 30

export function useConversations() {
  const supabase = useMemo(() => createClient(), [])
  const sharedMode = isSharedBackendMode()
  const [conversas, setConversas] = useState<ConversaActiva[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltroState] = useState<FiltroModo>('todas')
  const [search, setSearchState] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)

  // Construtor puro da query (sem setState) — partilhado pelo effect e pelo refetch.
  const buildConversasQuery = useCallback((pageNum: number, currentFiltro: FiltroModo, currentSearch: string) => {
    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('v_conversas_activas')
      .select('*', { count: 'exact' })
      .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
      .range(from, to)

    if (currentFiltro === 'bot') {
      query = query.eq('modo', 'bot')
    } else if (currentFiltro === 'humano') {
      query = query.eq('modo', 'humano')
    } else if (currentFiltro === 'pendentes') {
      query = query.eq('estado', 'paused_by_human')
    }

    if (currentSearch.trim()) {
      query = query.or(`cliente_nome.ilike.%${currentSearch.trim()}%,telefone.ilike.%${currentSearch.trim()}%`)
    }

    return query
  }, [supabase])

  const fetchConversas = useCallback(async (pageNum = 0, currentFiltro = filtro, currentSearch = search) => {
    if (sharedMode) {
      setLoading(true)
    }

    if (sharedMode) {
      const [contactsResult, dealsResult] = await Promise.all([
        supabase
          .from('contacts')
          .select('id,created_at,updated_at,nome,telefone,email,estagio,origem,notas,valor_total_pago,whatsapp_id')
          .order('updated_at', { ascending: false }),
        supabase
          .from('deals')
          .select('id,lead_id,title,status,total_paid,created_at,updated_at,expected_close_date,notes,payment_status,leads!lead_id(name,phone)')
          .order('updated_at', { ascending: false }),
      ])

      const sharedError = contactsResult.error || dealsResult.error
      if (sharedError) {
        console.error('[use-conversations] Erro shared:', sharedError.message)
        setConversas([])
        setHasMore(false)
        setLoading(false)
        return
      }

      const contacts = (contactsResult.data || []) as SharedContactRow[]
      const deals = (dealsResult.data || []) as SharedDealRow[]
      const latestDealByLead = new Map<string, SharedDealRow>()
      for (const deal of deals) {
        const current = latestDealByLead.get(deal.lead_id)
        if (!current || new Date(deal.updated_at).getTime() >= new Date(current.updated_at).getTime()) {
          latestDealByLead.set(deal.lead_id, deal)
        }
      }

      // Enriquecer com a última mensagem real de whatsapp_messages (preview + contadores).
      const contactIds = contacts.map((c) => c.id)
      const lastMsgByContact = new Map<
        string,
        { preview: string; at: string; sender: WhatsAppSenderType; enviadas: number }
      >()
      if (contactIds.length > 0) {
        let wmQuery = supabase
          .from('whatsapp_messages')
          .select('contact_id,content,message,direction,sender_type,created_at')
          .in('contact_id', contactIds)
          .order('created_at', { ascending: false })
          .limit(500)
        if (PUBLIC_SHARED_TENANT_ID) wmQuery = wmQuery.eq('tenant_id', PUBLIC_SHARED_TENANT_ID)
        const { data: wmRows } = await wmQuery
        for (const row of (wmRows || []) as Array<Record<string, unknown>>) {
          const cid = String(row.contact_id)
          const existing = lastMsgByContact.get(cid)
          const enviadas = (existing?.enviadas || 0) + (row.direction === 'outgoing' ? 1 : 0)
          if (!existing) {
            const sender: WhatsAppSenderType =
              row.direction === 'outgoing'
                ? (row.sender_type === 'humano' ? 'humano' : 'bot')
                : 'cliente'
            lastMsgByContact.set(cid, {
              preview: String(row.content || row.message || ''),
              at: String(row.created_at),
              sender,
              enviadas,
            })
          } else {
            existing.enviadas = enviadas
          }
        }
      }

      const mapped = contacts
        .map((contact) => {
          const base = mapSharedContactToConversa(contact, latestDealByLead.get(contact.id) || null)
          const wm = lastMsgByContact.get(contact.id)
          if (wm) {
            base.ultima_mensagem = wm.preview
            base.ultima_mensagem_em = wm.at
            base.ultimo_remetente = wm.sender
            base.total_messages_sent = wm.enviadas
          }
          return base
        })
        .filter((conv) => {
          if (currentFiltro === 'bot') return conv.modo === 'bot'
          if (currentFiltro === 'humano') return conv.modo === 'humano'
          if (currentFiltro === 'pendentes') return conv.estado === 'paused_by_human' || conv.estagio === 'orcamento'
          return true
        })
        .filter((conv) => {
          const q = currentSearch.trim().toLowerCase()
          if (!q) return true
          return conv.cliente_nome.toLowerCase().includes(q) || (conv.telefone || '').toLowerCase().includes(q)
        })
        .sort((a, b) => {
          const ta = a.ultima_mensagem_em ? new Date(a.ultima_mensagem_em).getTime() : 0
          const tb = b.ultima_mensagem_em ? new Date(b.ultima_mensagem_em).getTime() : 0
          return tb - ta
        })

      setConversas(mapped)
      setHasMore(false)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error, count } = await buildConversasQuery(pageNum, currentFiltro, currentSearch)

    if (error) {
      console.error('[use-conversations] Erro:', error.message)
    } else {
      if (pageNum === 0) {
        setConversas(data || [])
      } else {
        setConversas(prev => [...prev, ...(data || [])])
      }
      setHasMore((count || 0) > (pageNum + 1) * PAGE_SIZE)
    }

    setLoading(false)
  }, [buildConversasQuery, filtro, search, sharedMode, supabase])

  const loadMore = useCallback(() => {
    if (sharedMode) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchConversas(nextPage)
  }, [page, fetchConversas, sharedMode])

  useEffect(() => {
    if (sharedMode) {
      Promise.resolve().then(() => {
        void fetchConversas(0, filtro, search)
      })
      return
    }

    // setState corre dentro do .then (nunca no corpo sincrono do effect).
    let activo = true
    buildConversasQuery(0, filtro, search).then(({ data, error, count }) => {
      if (!activo) return
      if (error) {
        console.error('[use-conversations] Erro:', error.message)
      } else {
        setConversas(data || [])
        setHasMore((count || 0) > PAGE_SIZE)
      }
      setLoading(false)
    })
    return () => {
      activo = false
    }
  }, [buildConversasQuery, fetchConversas, filtro, search, sharedMode])

  // Realtime: actualizar lista quando conversas ou mensagens mudam
  useEffect(() => {
    if (sharedMode) {
      // Backend partilhado: ouvir whatsapp_messages e ai_agent_conversations.
      const channel = supabase
        .channel('inbox-realtime-shared')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, () => {
          void fetchConversas(0, filtro, search)
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_agent_conversations' }, () => {
          void fetchConversas(0, filtro, search)
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }

    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_agent_conversations' }, () => {
        fetchConversas(0)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp' }, () => {
        fetchConversas(0)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchConversas, sharedMode, filtro, search])

  const assumirConversa = useCallback(async (conversaId: string) => {
    const { error } = await supabase
      .from('ai_agent_conversations')
      .update({ status: 'paused_by_human' as ConversationStatus })
      .eq(sharedMode ? 'contact_id' : 'id', conversaId)

    if (error) throw new Error(`Falha ao assumir conversa: ${error.message}`)
    await fetchConversas(0)
  }, [sharedMode, supabase, fetchConversas])

  const devolverAoBot = useCallback(async (conversaId: string) => {
    const { error } = await supabase
      .from('ai_agent_conversations')
      .update({ status: 'active' as ConversationStatus, paused_by: null, pause_reason: null, paused_at: null })
      .eq(sharedMode ? 'contact_id' : 'id', conversaId)

    if (error) throw new Error(`Falha ao devolver ao bot: ${error.message}`)
    await fetchConversas(0)
  }, [sharedMode, supabase, fetchConversas])

  const setFiltro = useCallback((f: FiltroModo) => {
    setLoading(true)
    setFiltroState(f)
    setPage(0)
  }, [])

  const setSearch = useCallback((s: string) => {
    setLoading(true)
    setSearchState(s)
    setPage(0)
  }, [])

  const pendentesCount = conversas.filter(c => c.estado === 'paused_by_human' || c.estagio === 'orcamento').length

  return {
    conversas,
    loading,
    filtro,
    setFiltro,
    search,
    setSearch,
    hasMore,
    loadMore,
    assumirConversa,
    devolverAoBot,
    pendentesCount,
  }
}
