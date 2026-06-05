'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSharedBackendMode } from '@/lib/backend/config'
import {
  mapSharedContactToConversa,
  type SharedContactRow,
  type SharedDealRow,
} from '@/lib/backend/shared-mappers'
import type { ConversaActiva, ConversationStatus } from '@/types/database'

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

      const mapped = contacts
        .map((contact) => mapSharedContactToConversa(contact, latestDealByLead.get(contact.id) || null))
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
    if (sharedMode) return

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
  }, [supabase, fetchConversas, sharedMode])

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
