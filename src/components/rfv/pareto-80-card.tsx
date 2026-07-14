'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRfv } from '@/hooks/use-rfv'

// ============================================================
// Cartão 80/20 para o dashboard (story 2.7, AC4). Destinos ordenados por receita
// (contravalor AOA) com a marca do corte ~80% (Pareto). Consome via RPC só-admin
// (get_destinos_receita) — a um utilizador de operação a RPC devolve erro e o
// cartão simplesmente NÃO renderiza (não vaza valores nem ocupa espaço).
// Coexiste com o dashboard base (esqueleto da story 1.1) até a story 4.6 fechar.
// ============================================================

const FMT = new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
function aoa(n: number): string {
  return `${FMT.format(n)} AOA`
}

export function Pareto80Card() {
  const { destinos, ultimoRefresh, loading, error } = useRfv()

  const corte80 = useMemo(() => {
    const idx = destinos.findIndex((d) => d.pct_acumulada >= 80)
    return idx === -1 ? destinos.length : idx + 1
  }, [destinos])

  // Não-admin (RPC negada) ou sem dados de receita: não mostrar o cartão.
  if (error || (!loading && destinos.length === 0)) return null

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold text-gray-900">Receita por destino (80/20)</p>
            <p className="text-xs text-gray-400">
              {ultimoRefresh ? `Refresh: ${new Date(ultimoRefresh).toLocaleDateString('pt-AO')}` : 'Sem refresh'}
            </p>
          </div>
        </div>
        <Link href="/rfv" className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700">
          Ver tudo <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-gray-400">A carregar…</p>
      ) : (
        <ol className="space-y-2">
          {destinos.slice(0, 5).map((d, i) => {
            const noCore = i < corte80
            return (
              <li key={d.destino_id} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-right text-xs text-gray-400">{i + 1}</span>
                <span className="flex-1 truncate text-gray-800">
                  {d.pais}
                  {noCore && (
                    <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      80%
                    </span>
                  )}
                </span>
                <span className={cn('tabular-nums', noCore ? 'text-gray-700' : 'text-gray-400')}>
                  {aoa(d.receita_aoa)}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
