'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isSharedBackendMode, PUBLIC_SHARED_TENANT_ID } from '@/lib/backend/config'
import type { Notificacao, NotificacaoTipo } from '@/types/database'

// Mapeia o motivo da notificação da Soraya para o tipo do sino.
const MOTIVO_TO_TIPO: Record<string, NotificacaoTipo> = {
  falar_humano: 'takeover',
  orcamento_especial: 'urgente',
  pagamento: 'pagamento',
  cancelamento: 'urgente',
  outro: 'sistema',
}

interface SharedNotifRow {
  id: string
  created_at: string
  contact_id: string | null
  motivo: string
  mensagem: string
  cliente_nome: string | null
  cliente_telefone: string | null
  lida: boolean
}

function mapSharedNotif(row: SharedNotifRow): Notificacao {
  const prefixo = row.cliente_nome ? `${row.cliente_nome}: ` : ''
  return {
    id: row.id,
    created_at: row.created_at,
    cliente_id: row.contact_id,
    tipo: MOTIVO_TO_TIPO[row.motivo] || 'sistema',
    mensagem: `${prefixo}${row.mensagem}`,
    lida: Boolean(row.lida),
    lida_em: null,
  }
}

export function useNotifications() {
  const supabase = useMemo(() => createClient(), [])
  const sharedMode = isSharedBackendMode()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)

  const tabela = sharedMode ? 'isilda_notificacoes' : 'notificacoes'

  const fetchNotificacoes = useCallback(async () => {
    if (sharedMode) {
      let q = supabase
        .from('isilda_notificacoes')
        .select('id,created_at,contact_id,motivo,mensagem,cliente_nome,cliente_telefone,lida')
        .order('created_at', { ascending: false })
        .limit(50)
      if (PUBLIC_SHARED_TENANT_ID) q = q.eq('tenant_id', PUBLIC_SHARED_TENANT_ID)
      const { data, error } = await q
      if (error) console.error('[use-notifications] Erro shared:', error.message)
      else setNotificacoes((data as SharedNotifRow[] | null)?.map(mapSharedNotif) || [])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) console.error('[use-notifications] Erro:', error.message)
    else setNotificacoes(data || [])
    setLoading(false)
  }, [supabase, sharedMode])

  useEffect(() => {
    let activo = true
    void Promise.resolve().then(() => { if (activo) void fetchNotificacoes() })
    return () => { activo = false }
  }, [fetchNotificacoes])

  // Realtime: novas notificações aparecem instantaneamente
  useEffect(() => {
    const tbl = sharedMode ? 'isilda_notificacoes' : 'notificacoes'
    const channel = supabase
      .channel(`notificacoes-realtime-${tbl}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tbl }, () => {
        void fetchNotificacoes()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tbl }, () => {
        void fetchNotificacoes()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sharedMode, supabase, fetchNotificacoes])

  const marcarComoLida = useCallback(async (id: string) => {
    await supabase.from(tabela).update({ lida: true }).eq('id', id)
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }, [supabase, tabela])

  const marcarTodasComoLidas = useCallback(async () => {
    await supabase.from(tabela).update({ lida: true }).eq('lida', false)
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
  }, [supabase, tabela])

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return { notificacoes, loading, naoLidas, marcarComoLida, marcarTodasComoLidas }
}
