'use client'

interface WeekData {
  semana: string
  pedidos: number
}

interface MonthData {
  mes: string
  receita: number
}

interface CategoryData {
  categoria: string
  count: number
}

interface ChartsProps {
  pedidosPorSemana: WeekData[]
  receitaMensal: MonthData[]
  distribuicaoCategoria: CategoryData[]
}

const CATEGORY_COLORS: Record<string, string> = {
  chantilly: '#f43f5e',
  bento_cake: '#f97316',
  especiais: '#a855f7',
  naked_vintage: '#ec4899',
  doces: '#84cc16',
  casamento: '#eab308',
  outro: '#6b7280',
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const height = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-gray-600">{value}</span>
      <div className="w-8 bg-gray-100 rounded-t" style={{ height: 80 }}>
        <div
          className="w-full rounded-t bg-rose-400 transition-all"
          style={{ height: `${height}%`, marginTop: `${100 - height}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  )
}

export function Charts({ pedidosPorSemana, receitaMensal, distribuicaoCategoria }: ChartsProps) {
  const maxPedidos = Math.max(...pedidosPorSemana.map((d) => d.pedidos), 1)
  const maxReceita = Math.max(...receitaMensal.map((d) => d.receita), 1)
  const totalCategorias = distribuicaoCategoria.reduce((s, d) => s + d.count, 0)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Pedidos por semana */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Pedidos por semana</h3>
        <div className="flex items-end justify-between gap-1">
          {pedidosPorSemana.map((d) => (
            <Bar key={d.semana} value={d.pedidos} max={maxPedidos} label={d.semana} />
          ))}
        </div>
      </div>

      {/* Receita mensal */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Receita mensal (Kz)</h3>
        <div className="space-y-2">
          {receitaMensal.map((d) => (
            <div key={d.mes} className="flex items-center gap-2">
              <span className="w-8 text-[10px] text-gray-400">{d.mes}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${(d.receita / maxReceita) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-600 w-16 text-right">
                {(d.receita / 1000).toFixed(0)}k
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Distribuicao categorias */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Por categoria</h3>
        <div className="space-y-2">
          {distribuicaoCategoria.map((d) => {
            const pct = totalCategorias > 0 ? (d.count / totalCategorias) * 100 : 0
            const color = CATEGORY_COLORS[d.categoria] ?? '#6b7280'
            return (
              <div key={d.categoria} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="flex-1 text-xs text-gray-600 capitalize">
                  {d.categoria.replace('_', ' ')}
                </span>
                <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <span className="text-[10px] text-gray-400 w-6 text-right">{d.count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
