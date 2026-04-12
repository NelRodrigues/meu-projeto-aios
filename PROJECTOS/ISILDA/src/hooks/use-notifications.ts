'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notificacao } from '@/types/database'

export function useNotifications() {
  const supabase = useMemo(() => createClient(), [])
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotificacoes = useCallback(async () => {
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[use-notifications] Erro:', error.message)
    } else {
      setNotificacoes(data || [])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchNotificacoes()
  }, [fetchNotificacoes])

  // Realtime: novas notificacoes aparecem instantaneamente
  useEffect(() => {
    const channel = supabase
      .channel('notificacoes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
        setNotificacoes(prev => [payload.new as Notificacao, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificacoes' }, (payload) => {
        setNotificacoes(prev =>
          prev.map(n => n.id === (payload.new as Notificacao).id ? (payload.new as Notificacao) : n)
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const marcarComoLida = useCallback(async (id: string) => {
    await supabase
      .from('notificacoes')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('id', id)
  }, [supabase])

  const marcarTodasComoLidas = useCallback(async () => {
    await supabase
      .from('notificacoes')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('lida', false)
    await fetchNotificacoes()
  }, [supabase, fetchNotificacoes])

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return { notificacoes, loading, naoLidas, marcarComoLida, marcarTodasComoLidas }
}
