'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DayCell } from './day-cell'
import { DayDetailModal } from './day-detail-modal'
import type { CalendarioDia } from '@/types/database'
import { isSharedBackendMode } from '@/lib/backend/config'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type SharedCalendarPedido = {
  id: string
  cliente_nome: string
  produto_nome: string | null
  hora_entrega: string | null
  modo_entrega: string
  valor_final: number | null
  estado: string
  data: string
}

type SharedDealRow = {
  id: string
  title: string | null
  status: string | null
  total_paid: number | string | null
  created_at: string
  updated_at: string
  expected_close_date: string | null
  leads?: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null
}

function um<T>(rel: T | T[] | null): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel ?? null
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

function buildSharedCalendar(dayStart: Date, monthDays: number, deals: SharedDealRow[]) {
  const byDate = new Map<string, SharedCalendarPedido[]>()

  for (const deal of deals) {
    const data = (deal.expected_close_date || deal.created_at).split('T')[0]
    const lead = um(deal.leads)
    const item: SharedCalendarPedido = {
      id: deal.id,
      cliente_nome: lead?.name ?? 'Cliente desconhecido',
      produto_nome: deal.title,
      hora_entrega: null,
      modo_entrega: 'retirada',
      valor_final: toNumber(deal.total_paid) || null,
      estado: deal.status || 'novo',
      data,
    }
    if (!byDate.has(data)) byDate.set(data, [])
    byDate.get(data)!.push(item)
  }

  const calendario = new Map<string, CalendarioDia>()
  const today = new Date()
  const hojeStr = today.toISOString().split('T')[0]
  for (let day = 1; day <= monthDays; day++) {
    const data = new Date(dayStart.getFullYear(), dayStart.getMonth(), day).toISOString().split('T')[0]
    const pedidos = byDate.get(data) || []
    const capacidade = 5
    const status =
      data < hojeStr
        ? 'passado'
        : pedidos.length >= capacidade
          ? 'lotado'
          : pedidos.length >= Math.ceil(capacidade * 0.7)
            ? 'quase_lotado'
            : 'disponivel'

    calendario.set(data, {
      data,
      capacidade_maxima: capacidade,
      notas: pedidos.length ? `${pedidos.length} pedido(s) no backend partilhado` : null,
      bloqueado: false,
      pedidos_agendados: pedidos.length,
      vagas_disponiveis: Math.max(0, capacidade - pedidos.length),
      status,
    })
  }

  return { calendario, byDate }
}

function SharedDayModal({
  dia,
  pedidos,
  onClose,
}: {
  dia: CalendarioDia
  pedidos: SharedCalendarPedido[]
  onClose: () => void
}) {
  const dataFormatada = new Date(dia.data + 'T00:00:00').toLocaleDateString('pt-AO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b p-4">
          <h2 className="font-semibold text-gray-900 capitalize">{dataFormatada}</h2>
          <p className="text-xs text-gray-500">{dia.pedidos_agendados} pedido(s) no backend partilhado</p>
        </div>
        <div className="p-4">
          {pedidos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum pedido agendado neste dia</p>
          ) : (
            <div className="space-y-2">
              {pedidos.map((p) => (
                <div key={p.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">{p.cliente_nome}</p>
                  <p className="text-xs text-gray-500">
                    {p.produto_nome || 'Pedido personalizado'}
                    {p.valor_final ? ` · ${p.valor_final.toLocaleString('pt-AO')} Kz` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end border-t p-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export function MonthView() {
  const sharedMode = isSharedBackendMode()
  const today = new Date()
  const [ano, setAno] = useState(today.getFullYear())
  const [mes, setMes] = useState(today.getMonth()) // 0-based
  const [calendario, setCalendario] = useState<Map<string, CalendarioDia>>(new Map())
  const [sharedPedidosPorDia, setSharedPedidosPorDia] = useState<Map<string, SharedCalendarPedido[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedDia, setSelectedDia] = useState<CalendarioDia | null>(null)
  const supabase = createClient()

  const fetchCalendario = useCallback(async () => {
    setLoading(true)
    const inicio = new Date(ano, mes, 1).toISOString().split('T')[0]
    const fim = new Date(ano, mes + 1, 0).toISOString().split('T')[0]

    if (sharedMode) {
      const { data } = await supabase
        .from('deals')
        .select('id,title,status,total_paid,created_at,updated_at,expected_close_date,leads!lead_id(name,phone)')
        .gte('expected_close_date', inicio)
        .lte('expected_close_date', fim)
        .order('expected_close_date', { ascending: true })

      const deals = (data || []) as SharedDealRow[]
      const { calendario: sharedCalendario, byDate } = buildSharedCalendar(new Date(ano, mes, 1), new Date(ano, mes + 1, 0).getDate(), deals)
      setCalendario(sharedCalendario)
      setSharedPedidosPorDia(byDate)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('v_calendario_producao')
      .select('*')
      .gte('data', inicio)
      .lte('data', fim)

    if (data) {
      const map = new Map<string, CalendarioDia>()
      for (const d of data) {
        map.set(d.data, d as CalendarioDia)
      }
      setCalendario(map)
    }
    setLoading(false)
  }, [ano, mes, sharedMode, supabase])

  useEffect(() => {
    let activo = true
    const inicio = new Date(ano, mes, 1).toISOString().split('T')[0]
    const fim = new Date(ano, mes + 1, 0).toISOString().split('T')[0]

    if (sharedMode) {
      supabase
        .from('deals')
        .select('id,title,status,total_paid,created_at,updated_at,expected_close_date,leads!lead_id(name,phone)')
        .gte('expected_close_date', inicio)
        .lte('expected_close_date', fim)
        .order('expected_close_date', { ascending: true })
        .then(({ data }) => {
          if (!activo) return
          const deals = (data || []) as SharedDealRow[]
          const { calendario: sharedCalendario, byDate } = buildSharedCalendar(new Date(ano, mes, 1), new Date(ano, mes + 1, 0).getDate(), deals)
          setCalendario(sharedCalendario)
          setSharedPedidosPorDia(byDate)
          setLoading(false)
        })
      return () => {
        activo = false
      }
    }

    // setState corre dentro da .then (nunca no corpo sincrono do effect).
    supabase
      .from('v_calendario_producao')
      .select('*')
      .gte('data', inicio)
      .lte('data', fim)
      .then(({ data }) => {
        if (!activo) return
        if (data) {
          const map = new Map<string, CalendarioDia>()
          for (const d of data) {
            map.set((d as CalendarioDia).data, d as CalendarioDia)
          }
          setCalendario(map)
        }
        setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [ano, mes, sharedMode, supabase])

  const prevMes = () => {
    setLoading(true)
    if (mes === 0) { setMes(11); setAno(ano - 1) }
    else setMes(mes - 1)
  }
  const nextMes = () => {
    setLoading(true)
    if (mes === 11) { setMes(0); setAno(ano + 1) }
    else setMes(mes + 1)
  }

  // Construir grid do mes
  const primeiroDia = new Date(ano, mes, 1).getDay() // 0=Dom
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const todayStr = today.toISOString().split('T')[0]

  // Preencher células: null para padding + dias do mes
  const cells: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]
  // Pad para completar semanas
  while (cells.length % 7 !== 0) cells.push(null)

  const getDayString = (day: number) => {
    const d = new Date(ano, mes, day)
    return d.toISOString().split('T')[0]
  }

  // Estatísticas do mês
  const diasLotados = [...calendario.values()].filter((d) => d.status === 'lotado').length
  const totalPedidos = [...calendario.values()].reduce((s, d) => s + d.pedidos_agendados, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMes}
            className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {MESES[mes]} {ano}
          </h2>
          <button
            onClick={nextMes}
            className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Stats do mes */}
        <div className="hidden items-center gap-4 text-sm sm:flex">
          <span className="text-gray-500">
            <span className="font-semibold text-gray-900">{totalPedidos}</span> pedidos
          </span>
          {diasLotados > 0 && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              {diasLotados} dia{diasLotados !== 1 ? 's' : ''} lotado{diasLotados !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { color: 'bg-emerald-400', label: 'Disponível' },
          { color: 'bg-amber-400', label: 'Quase lotado' },
          { color: 'bg-red-400', label: 'Lotado' },
          { color: 'bg-gray-300', label: 'Bloqueado' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-gray-500">
            <span className={`h-2.5 w-2.5 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <div>
          {/* Cabecalho dias semana */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Celulas */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={`pad-${idx}`} className="aspect-square" />
              const dayStr = getDayString(day)
              const diaData = calendario.get(dayStr) ?? null
              return (
                <DayCell
                  key={dayStr}
                  dia={diaData}
                  dayNumber={day}
                  isToday={dayStr === todayStr}
                  onClick={diaData
                    ? (d) => {
                        if (sharedMode) {
                          setSelectedDia(d)
                        } else {
                          setSelectedDia(d)
                        }
                      }
                    : undefined}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Modal detalhe */}
      {!sharedMode && selectedDia && (
        <DayDetailModal
          dia={selectedDia}
          onClose={() => setSelectedDia(null)}
          onUpdate={fetchCalendario}
        />
      )}
      {sharedMode && selectedDia && (
        <SharedDayModal
          dia={selectedDia}
          pedidos={sharedPedidosPorDia.get(selectedDia.data) || []}
          onClose={() => setSelectedDia(null)}
        />
      )}
    </div>
  )
}
