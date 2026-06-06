'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PedidoEstado, WhatsAppSenderType } from '@/types/database'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { Charts } from '@/components/dashboard/charts'
import { UrgentActions } from '@/components/dashboard/urgent-actions'
import { DailyChecklist } from '@/components/dashboard/daily-checklist'
import { BackendStatusBanner } from '@/components/system/backend-status-banner'
import { isSharedBackendMode } from '@/lib/backend/config'

const MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ---- Shapes derivados dos .select() do Supabase (joins parciais) ----
// Os joins do Supabase podem devolver objecto ou array consoante a relacao,
// por isso modelamos como possivelmente array e normalizamos abaixo.
type Relacionado<T> = T | T[] | null

interface PedidoRow {
  estado: PedidoEstado
  valor_final: number | null
  data_entrega: string | null
  hora_entrega: string | null
  produtos_catalogo: Relacionado<{ nome: string | null; categoria: string | null }>
  clientes: Relacionado<{ nome: string | null }>
}

interface MensagemRow {
  sender_type: WhatsAppSenderType
}

interface PagamentoRow {
  id: string
  valor: number
  pedido_id: string | null
  clientes: Relacionado<{ nome: string | null }>
  created_at: string
}

interface EntregaRow {
  id: string
  hora_entrega: string | null
  clientes: Relacionado<{ nome: string | null }>
  produtos_catalogo: Relacionado<{ nome: string | null }>
}

interface ConversaRow {
  id: string
  clientes: Relacionado<{ nome: string | null }>
}

interface OcasiaoRow {
  cliente_nome: string
  tipo: string | null
  dias_falta: number
}

// Helper: extrai o primeiro registo de uma relacao (objecto ou array).
function umRelacionado<T>(rel: Relacionado<T>): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel ?? null
}

interface PagamentoPendente {
  id: string
  cliente_nome: string
  valor: number
  horas: number
}

interface EntregaHoje {
  id: string
  cliente_nome: string
  produto: string
  hora: string
}

interface ConversaPendente {
  id: string
  cliente_nome: string
}

interface ProximaOcasiao {
  nome: string
  tipo: string
  dias: number
}

type Periodo = 7 | 30 | 90

const PERIODO_OPCOES: { valor: Periodo; label: string }[] = [
  { valor: 7, label: '7 dias' },
  { valor: 30, label: '30 dias' },
  { valor: 90, label: '90 dias' },
]

export default function DashboardPage() {
  const sharedMode = isSharedBackendMode()
  const [periodo, setPeriodo] = useState<Periodo>(30)
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState({
    pedidosHoje: 0, pedidosSemana: 0, pedidosMes: 0,
    receitaMes: 0, ticketMedio: 0, taxaConversao: 0, taxaAutomacao: 0, clientesNovos: 0,
  })
  const [pedidosPorSemana, setPedidosPorSemana] = useState<{ semana: string; pedidos: number }[]>([])
  const [receitaMensal, setReceitaMensal] = useState<{ mes: string; receita: number }[]>([])
  const [distribuicaoCategoria, setDistribuicaoCategoria] = useState<{ categoria: string; count: number }[]>([])
  const [pagamentosPendentes, setPagamentosPendentes] = useState<PagamentoPendente[]>([])
  const [entregasHoje, setEntregasHoje] = useState<EntregaHoje[]>([])
  const [conversasPendentes, setConversasPendentes] = useState<ConversaPendente[]>([])
  const [proximasOcasioes, setProximasOcasioes] = useState<ProximaOcasiao[]>([])

  const supabase = createClient()

  // Muda o periodo e activa o estado de loading (event handler -> setState seguro).
  const handlePeriodo = (novo: Periodo) => {
    if (novo === periodo) return
    setLoading(true)
    setPeriodo(novo)
  }

  useEffect(() => {
    async function fetchDashboard() {
      const hoje = new Date()
      const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()))
      const inicioPeriodo = new Date(Date.now() - periodo * 24 * 60 * 60 * 1000)
      const hoje2 = new Date()

      if (sharedMode) {
        const [
          { data: contacts },
          { data: deals },
          { data: leads },
        ] = await Promise.all([
          supabase.from('contacts').select('id,created_at,updated_at,nome,telefone,email,estagio,origem,notas,valor_total_pago,whatsapp_id').gte('created_at', inicioPeriodo.toISOString()),
          supabase.from('deals').select('id,lead_id,title,status,total_paid,created_at,updated_at,expected_close_date,notes,payment_status,leads!lead_id(name,phone)').gte('created_at', inicioPeriodo.toISOString()),
          supabase.from('leads').select('id,name,phone,status,sales_stage,sales_score,created_at,updated_at,last_interaction_at').gte('created_at', inicioPeriodo.toISOString()),
        ])

        const sharedDeals = (deals ?? []) as Array<{
          id: string
          lead_id: string
          title: string | null
          status: string | null
          total_paid: number | string | null
          created_at: string
          updated_at: string
          expected_close_date: string | null
          notes: string | null
          payment_status: string | null
        }>

        const sharedContacts = (contacts ?? []) as Array<{
          id: string
          created_at: string
          valor_total_pago: number | string | null
          estagio: string | null
          origem: string | null
          nome: string
          telefone: string | null
        }>

        const pedidosMes = sharedDeals.length
        const pedidosHojeArr = sharedDeals.filter((d) => (d.expected_close_date || d.created_at).split('T')[0] === hoje2.toISOString().split('T')[0])
        const pedidosSemanaArr = sharedDeals.filter((d) => {
          const created = new Date(d.created_at)
          return created >= inicioSemana
        })
        const receitaMesVal = sharedDeals.reduce((sum, deal) => sum + (Number(deal.total_paid) || 0), 0)
        const ticketMedio = pedidosMes > 0 ? receitaMesVal / pedidosMes : 0
        const pagos = sharedDeals.filter((d) => ['won', 'paid', 'pago'].includes((d.status || '').toLowerCase())).length
        const taxaConversao = pedidosMes > 0 ? (pagos / pedidosMes) * 100 : 0
        const taxaAutomacao = leads?.length ? 0 : 0

        setKpi({
          pedidosHoje: pedidosHojeArr.length,
          pedidosSemana: pedidosSemanaArr.length,
          pedidosMes,
          receitaMes: receitaMesVal,
          ticketMedio,
          taxaConversao,
          taxaAutomacao,
          clientesNovos: sharedContacts.length,
        })

        const semanaData: { semana: string; pedidos: number }[] = []
        for (let w = 7; w >= 0; w--) {
          const inicio = new Date()
          inicio.setDate(inicio.getDate() - (w + 1) * 7)
          const fim = new Date()
          fim.setDate(fim.getDate() - w * 7)
          semanaData.push({
            semana: `S${8 - w}`,
            pedidos: sharedDeals.filter((d) => {
              const created = new Date(d.created_at)
              return created >= inicio && created < fim
            }).length,
          })
        }
        setPedidosPorSemana(semanaData)

        const receitaData: { mes: string; receita: number }[] = []
        for (let m = 5; m >= 0; m--) {
          const d = new Date()
          d.setMonth(d.getMonth() - m)
          const inicio = new Date(d.getFullYear(), d.getMonth(), 1)
          const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1)
          const receita = sharedDeals
            .filter((deal) => {
              const created = new Date(deal.created_at)
              return created >= inicio && created < fim
            })
            .reduce((sum, deal) => sum + (Number(deal.total_paid) || 0), 0)
          receitaData.push({ mes: MESES_SHORT[d.getMonth()], receita })
        }
        setReceitaMensal(receitaData)

        setDistribuicaoCategoria([
          { categoria: 'negociacao', count: sharedDeals.filter((d) => d.status === 'negotiation').length },
          { categoria: 'ganhos', count: sharedDeals.filter((d) => ['won', 'paid'].includes((d.status || '').toLowerCase())).length },
          { categoria: 'perdidos', count: sharedDeals.filter((d) => ['lost', 'cancelled', 'canceled'].includes((d.status || '').toLowerCase())).length },
        ].filter((item) => item.count > 0))

        setPagamentosPendentes(sharedDeals
          .filter((d) => !['won', 'paid', 'pago'].includes((d.status || '').toLowerCase()))
          .slice(0, 5)
          .map((d) => ({
            id: d.id,
            cliente_nome: d.title ?? 'Cliente desconhecido',
            valor: Number(d.total_paid) || 0,
            horas: Math.max(0, Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60))),
          })))
        setEntregasHoje([])
        setConversasPendentes([])
        setProximasOcasioes([])
        setLoading(false)
        return
      }

      // Intervalo do filtro de periodo: ultimos N dias a partir de agora.
      const inicioPeriodoIso = inicioPeriodo.toISOString()

      const [
        { data: pedidosData },
        { data: mensagensData },
        { data: clientesNovos },
        { data: pagamentos },
        { data: entregas },
        { data: conversas },
        { data: ocasioes },
      ] = await Promise.all([
        supabase.from('pedidos').select('estado, valor_final, data_entrega, hora_entrega, produtos_catalogo!produto_id(nome, categoria), clientes!cliente_id(nome)').gte('created_at', inicioPeriodoIso),
        supabase.from('mensagens_whatsapp').select('sender_type').gte('created_at', inicioPeriodoIso),
        supabase.from('clientes').select('id').gte('created_at', inicioPeriodoIso),
        supabase.from('pagamentos').select('id, valor, pedido_id, clientes!cliente_id(nome), created_at').eq('estado', 'pendente'),
        supabase.from('pedidos').select('id, hora_entrega, clientes!cliente_id(nome), produtos_catalogo!produto_id(nome)').eq('data_entrega', hoje2.toISOString().split('T')[0]).not('estado', 'in', '(cancelado,entregue)'),
        supabase.from('ai_agent_conversations').select('id, clientes!cliente_id(nome)').eq('status', 'paused_by_human'),
        supabase.rpc('get_upcoming_occasions', { p_dias_min: 1, p_dias_max: 30 }),
      ])

      const pedidos = (pedidosData ?? []) as unknown as PedidoRow[]
      const mensagens = (mensagensData ?? []) as unknown as MensagemRow[]

      // KPIs
      const hoje3 = new Date()
      const pedidosMes = pedidos.length
      const pedidosHojeArr = pedidos.filter((p) => p.data_entrega === hoje3.toISOString().split('T')[0])
      const pedidosSemanaArr = pedidos.filter((p) => p.data_entrega != null && new Date(p.data_entrega) >= inicioSemana)
      const receitaMesVal = pedidos.filter((p) => ['pago', 'entregue'].includes(p.estado)).reduce((s, p) => s + (p.valor_final || 0), 0)
      const ticketMedio = pedidosMes > 0 ? receitaMesVal / pedidosMes : 0
      const orcamentos = pedidos.filter((p) => ['orcamento', 'confirmado', 'pago', 'em_producao', 'pronto', 'entregue'].includes(p.estado)).length
      const pagos = pedidos.filter((p) => ['pago', 'em_producao', 'pronto', 'entregue'].includes(p.estado)).length
      const taxaConversao = orcamentos > 0 ? (pagos / orcamentos) * 100 : 0
      const msgBot = mensagens.filter((m) => m.sender_type === 'bot').length
      const taxaAutomacao = mensagens.length > 0 ? (msgBot / mensagens.length) * 100 : 0

      setKpi({
        pedidosHoje: pedidosHojeArr.length,
        pedidosSemana: pedidosSemanaArr.length,
        pedidosMes,
        receitaMes: receitaMesVal,
        ticketMedio,
        taxaConversao,
        taxaAutomacao,
        clientesNovos: clientesNovos?.length ?? 0,
      })

      // Pedidos por semana (ultimas 8 semanas)
      const semanaData: { semana: string; pedidos: number }[] = []
      for (let w = 7; w >= 0; w--) {
        const inicio = new Date()
        inicio.setDate(inicio.getDate() - (w + 1) * 7)
        const fim = new Date()
        fim.setDate(fim.getDate() - w * 7)
        const { count } = await supabase.from('pedidos').select('id', { count: 'exact', head: true }).gte('created_at', inicio.toISOString()).lt('created_at', fim.toISOString())
        semanaData.push({ semana: `S${8 - w}`, pedidos: count ?? 0 })
      }
      setPedidosPorSemana(semanaData)

      // Receita ultimos 6 meses
      const receitaData: { mes: string; receita: number }[] = []
      for (let m = 5; m >= 0; m--) {
        const d = new Date()
        d.setMonth(d.getMonth() - m)
        const inicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
        const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
        const { data: r } = await supabase.from('pedidos').select('valor_final').gte('created_at', inicio).lte('created_at', fim).in('estado', ['pago', 'entregue'])
        const receita = ((r ?? []) as { valor_final: number | null }[]).reduce((s, p) => s + (p.valor_final || 0), 0)
        receitaData.push({ mes: MESES_SHORT[d.getMonth()], receita })
      }
      setReceitaMensal(receitaData)

      // Distribuicao categorias
      const catMap: Record<string, number> = {}
      for (const p of pedidos) {
        const cat = umRelacionado(p.produtos_catalogo)?.categoria ?? 'outro'
        catMap[cat] = (catMap[cat] || 0) + 1
      }
      setDistribuicaoCategoria(Object.entries(catMap).map(([cat, count]) => ({ categoria: cat, count })).sort((a, b) => b.count - a.count))

      // Urgent
      setPagamentosPendentes(((pagamentos ?? []) as unknown as PagamentoRow[]).map((p) => ({
        id: p.id,
        cliente_nome: umRelacionado(p.clientes)?.nome ?? 'Desconhecido',
        valor: p.valor,
        horas: Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)),
      })))
      setEntregasHoje(((entregas ?? []) as unknown as EntregaRow[]).map((e) => ({
        id: e.id,
        cliente_nome: umRelacionado(e.clientes)?.nome ?? 'Desconhecido',
        produto: umRelacionado(e.produtos_catalogo)?.nome ?? 'Produto',
        hora: e.hora_entrega?.substring(0, 5) ?? '',
      })))
      setConversasPendentes(((conversas ?? []) as unknown as ConversaRow[]).map((c) => ({
        id: c.id,
        cliente_nome: umRelacionado(c.clientes)?.nome ?? 'Desconhecido',
      })))
      setProximasOcasioes(((ocasioes ?? []) as unknown as OcasiaoRow[]).slice(0, 5).map((o) => ({
        nome: o.cliente_nome,
        tipo: o.tipo?.replace(/_/g, ' ') ?? 'evento',
        dias: o.dias_falta,
      })))

      setLoading(false)
    }

    fetchDashboard()
  }, [supabase, periodo, sharedMode])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <BackendStatusBanner />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString('pt-AO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Filtro de periodo */}
        <div className="flex items-center gap-1 rounded-xl border border-rose-100 bg-white p-1">
          {PERIODO_OPCOES.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => handlePeriodo(opcao.valor)}
              className={
                periodo === opcao.valor
                  ? 'rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors'
                  : 'rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-colors'
              }
            >
              {opcao.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <KPICards data={kpi} />

          {/* Accoes Urgentes + Graficos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-gray-700">Acções Urgentes</h2>
                <UrgentActions
                  pagamentosPendentes={pagamentosPendentes}
                  entregasHoje={entregasHoje}
                  conversasPendentes={conversasPendentes}
                  proximasOcasioes={proximasOcasioes}
                />
              </div>
              <DailyChecklist />
            </div>

            <div className="lg:col-span-2">
              <Charts
                pedidosPorSemana={pedidosPorSemana}
                receitaMensal={receitaMensal}
                distribuicaoCategoria={distribuicaoCategoria}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
