'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConversaActiva, ConversationStatus } from '@/types/database'

type FiltroModo = 'todas' | 'bot' | 'humano' | 'pendentes' | 'transferidas'

const PAGE_SIZE = 30

export function useConversations() {
  const supabase = useMemo(() => createClient(), [])
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
      query = query.eq('estado', 'active')
    } else if (currentFiltro === 'humano') {
      query = query.eq('estado', 'paused_by_human')
    } else if (currentFiltro === 'pendentes') {
      query = query.eq('estado', 'paused_by_human')
    } else if (currentFiltro === 'transferidas') {
      query = query.eq('estado', 'transferred')
    }

    if (currentSearch.trim()) {
      query = query.or(`cliente_nome.ilike.%${currentSearch.trim()}%,telefone.ilike.%${currentSearch.trim()}%`)
    }

    return query
  }, [supabase])

  const fetchConversas = useCallback(async (pageNum = 0, currentFiltro = filtro, currentSearch = search) => {
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
  }, [buildConversasQuery, filtro, search])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchConversas(nextPage)
  }, [page, fetchConversas])

  useEffect(() => {
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
  }, [buildConversasQuery, filtro, search])

  // Realtime: actualizar lista quando conversas ou mensagens mudam
  useEffect(() => {
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
  }, [supabase, fetchConversas])

  const assumirConversa = useCallback(async (conversaId: string) => {
    // AC2: assumir → paused_by_human COM pause_reason='manual' (o operador tomou
    // o controlo manualmente pela inbox).
    const { error } = await supabase
      .from('ai_agent_conversations')
      .update({
        status: 'paused_by_human' as ConversationStatus,
        pause_reason: 'manual',
        paused_at: new Date().toISOString(),
      })
      .eq('id', conversaId)

    if (error) throw new Error(`Falha ao assumir conversa: ${error.message}`)
    await fetchConversas(0)
  }, [supabase, fetchConversas])

  const devolverAoBot = useCallback(async (conversaId: string) => {
    const { error } = await supabase
      .from('ai_agent_conversations')
      .update({ status: 'active' as ConversationStatus, paused_by: null, pause_reason: null, paused_at: null })
      .eq('id', conversaId)

    if (error) throw new Error(`Falha ao devolver ao bot: ${error.message}`)
    await fetchConversas(0)
  }, [supabase, fetchConversas])

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
