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
    if (error) console.error('[use-notifications] Erro:', error.message)
    else setNotificacoes(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    let activo = true
    void Promise.resolve().then(() => { if (activo) void fetchNotificacoes() })
    return () => { activo = false }
  }, [fetchNotificacoes])

  // Realtime: novas notificações aparecem instantaneamente
  useEffect(() => {
    const channel = supabase
      .channel('notificacoes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, () => {
        void fetchNotificacoes()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificacoes' }, () => {
        void fetchNotificacoes()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchNotificacoes])

  const marcarComoLida = useCallback(async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }, [supabase])

  const marcarTodasComoLidas = useCallback(async () => {
    await supabase.from('notificacoes').update({ lida: true }).eq('lida', false)
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
  }, [supabase])

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return { notificacoes, loading, naoLidas, marcarComoLida, marcarTodasComoLidas }
}
