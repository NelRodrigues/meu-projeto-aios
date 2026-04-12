'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConversaActiva, ModoConversa, ConversationStatus } from '@/types/database'

type FiltroModo = 'todas' | 'bot' | 'humano' | 'pendentes'

const PAGE_SIZE = 30

export function useConversations() {
  const supabase = useMemo(() => createClient(), [])
  const [conversas, setConversas] = useState<ConversaActiva[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltroState] = useState<FiltroModo>('todas')
  const [search, setSearchState] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)

  const fetchConversas = useCallback(async (pageNum = 0, currentFiltro = filtro, currentSearch = search) => {
    setLoading(true)

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

    const { data, error, count } = await query

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
  }, [supabase, filtro, search])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchConversas(nextPage)
  }, [page, fetchConversas])

  useEffect(() => {
    fetchConversas(0)
  }, [fetchConversas])

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
    const { error } = await supabase
      .from('ai_agent_conversations')
      .update({ status: 'paused_by_human' as ConversationStatus })
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
    setFiltroState(f)
    setPage(0)
  }, [])

  const setSearch = useCallback((s: string) => {
    setSearchState(s)
    setPage(0)
  }, [])

  // Contagem de pendentes (paused_by_human)
  const pendentesCount = conversas.filter(c => c.estado === 'paused_by_human').length

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
