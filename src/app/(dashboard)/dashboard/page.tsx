'use client'

import { useState, useEffect } from 'react'
import { Users, MessageSquare, Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { WhatsAppSenderType } from '@/types/database'
import { BackendStatusBanner } from '@/components/system/backend-status-banner'
import { Pareto80Card } from '@/components/rfv/pareto-80-card'

interface MensagemRow {
  sender_type: WhatsAppSenderType
}

// Esqueleto de fundacao (story 1.1): apenas metricas base a partir das tabelas
// reais da migracao 002 (`leads`, `mensagens_whatsapp`). Os widgets de dominio
// (pedidos, catalogo, calendario, ocasioes) entram nos epicos seguintes.
export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [leadsTotal, setLeadsTotal] = useState(0)
  const [leadsNovos, setLeadsNovos] = useState(0)
  const [taxaAutomacao, setTaxaAutomacao] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    let activo = true

    async function fetchDashboard() {
      const inicioMes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [totalRes, novosRes, mensagensRes] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', inicioMes),
        supabase.from('mensagens_whatsapp').select('sender_type').gte('created_at', inicioMes),
      ])

      if (!activo) return

      const mensagens = (mensagensRes.data ?? []) as MensagemRow[]
      const msgBot = mensagens.filter((m) => m.sender_type === 'bot').length
      setLeadsTotal(totalRes.count ?? 0)
      setLeadsNovos(novosRes.count ?? 0)
      setTaxaAutomacao(mensagens.length > 0 ? (msgBot / mensagens.length) * 100 : 0)
      setLoading(false)
    }

    void fetchDashboard()
    return () => {
      activo = false
    }
  }, [supabase])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <BackendStatusBanner />

      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('pt-AO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard icon={Users} label="Leads (total)" value={String(leadsTotal)} color="bg-rose-500" />
          <KpiCard icon={MessageSquare} label="Leads novos (30d)" value={String(leadsNovos)} color="bg-emerald-500" />
          <KpiCard icon={Bot} label="Automacao bot" value={`${taxaAutomacao.toFixed(0)}%`} color="bg-blue-500" />
        </div>
      )}

      {/* Cartão 80/20 — receita por destino (story 2.7). Só renderiza para admin
          (a RPC de receita é só-admin); operação não vê valores agregados. */}
      <Pareto80Card />
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-sm font-medium text-gray-500">{label}</p>
      </div>
    </div>
  )
}
