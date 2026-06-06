'use client'

import { TrendingUp, ShoppingBag, Bot, CreditCard } from 'lucide-react'

interface KPIData {
  pedidosHoje: number
  pedidosSemana: number
  pedidosMes: number
  receitaMes: number
  ticketMedio: number
  taxaConversao: number
  taxaAutomacao: number
  clientesNovos: number
}

interface KPICardsProps {
  data: KPIData
}

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-sm font-medium text-gray-500">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard
        icon={ShoppingBag}
        label="Pedidos este mês"
        value={String(data.pedidosMes)}
        sub={`${data.pedidosHoje} hoje · ${data.pedidosSemana} esta semana`}
        color="bg-rose-500"
      />
      <KPICard
        icon={CreditCard}
        label="Receita do mês"
        value={`${data.receitaMes.toLocaleString('pt-AO')} Kz`}
        sub={`Ticket médio: ${data.ticketMedio.toLocaleString('pt-AO')} Kz`}
        color="bg-emerald-500"
      />
      <KPICard
        icon={TrendingUp}
        label="Taxa de conversão"
        value={`${data.taxaConversao.toFixed(0)}%`}
        sub="Orçamento → Pago"
        color="bg-amber-500"
      />
      <KPICard
        icon={Bot}
        label="Automação bot"
        value={`${data.taxaAutomacao.toFixed(0)}%`}
        sub={`${data.clientesNovos} clientes novos`}
        color="bg-blue-500"
      />
    </div>
  )
}
