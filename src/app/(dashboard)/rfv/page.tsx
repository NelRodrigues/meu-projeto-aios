'use client'

import { useState, useMemo } from 'react'
import { BarChart3, RefreshCw, ShieldAlert, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRfv, type RfvLead, type RfvSegmento } from '@/hooks/use-rfv'

// ============================================================
// Matriz RFV por lead (story 2.7, AC3). Só-admin — consome via RPC
// (get_rfv_leads/get_destinos_receita/get_rfv_last_refresh). Um utilizador de
// operação recebe erro do RAISE e vê o aviso de acesso. A data do último refresh
// fica sempre visível; o botão dispara o refresh manual pela rota admin.
// ============================================================

const SEG_LABEL: Record<RfvSegmento, string> = {
  campeao: 'Campeão',
  regular: 'Regular',
  em_risco: 'Em risco',
  inactivo: 'Inactivo',
  novo: 'Novo',
}

const SEG_STYLE: Record<RfvSegmento, string> = {
  campeao: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  regular: 'bg-blue-50 text-blue-700 border-blue-200',
  em_risco: 'bg-amber-50 text-amber-700 border-amber-200',
  inactivo: 'bg-gray-100 text-gray-500 border-gray-200',
  novo: 'bg-violet-50 text-violet-700 border-violet-200',
}

const FMT = new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
function aoa(n: number): string {
  return `${FMT.format(n)} AOA`
}

function scoreDots(score: number): string {
  return '●'.repeat(score) + '○'.repeat(5 - score)
}

const SEGMENTOS: (RfvSegmento | 'todos')[] = ['todos', 'campeao', 'regular', 'em_risco', 'inactivo', 'novo']

export default function RfvPage() {
  const { leads, destinos, ultimoRefresh, loading, error, refrescar } = useRfv()
  const [filtro, setFiltro] = useState<RfvSegmento | 'todos'>('todos')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)

  const filtrados = useMemo(
    () => (filtro === 'todos' ? leads : leads.filter((l) => l.segmento === filtro)),
    [leads, filtro]
  )

  const contagens = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of leads) c[l.segmento] = (c[l.segmento] ?? 0) + 1
    return c
  }, [leads])

  // Corte 80/20: destinos até (e incluindo) o que cruza os 80% acumulados.
  const corte80 = useMemo(() => {
    const idx = destinos.findIndex((d) => d.pct_acumulada >= 80)
    return idx === -1 ? destinos.length : idx + 1
  }, [destinos])

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshMsg(null)
    try {
      await refrescar()
      setRefreshMsg('RFV refrescado com sucesso.')
    } catch (err) {
      setRefreshMsg(err instanceof Error ? err.message : 'Falha ao refrescar.')
    } finally {
      setRefreshing(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <ShieldAlert className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-gray-700">Sem acesso à análise RFV.</p>
        <p className="max-w-md text-center text-xs text-gray-500">
          O RFV e a receita por destino são dados sensíveis — visíveis apenas a administradores. {error}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-rose-500" />
            <h1 className="font-heading text-2xl font-bold text-gray-900">RFV e 80/20</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {leads.length} leads analisados ·{' '}
            {ultimoRefresh
              ? `Último refresh: ${new Date(ultimoRefresh).toLocaleString('pt-AO')}`
              : 'Ainda sem refresh'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          title="Refresca as views materializadas RFV e receita por destino"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          {refreshing ? 'A refrescar…' : 'Refrescar RFV'}
        </button>
      </div>

      {refreshMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {refreshMsg}
        </div>
      )}

      {/* Cartão 80/20 — destinos por receita com marca do corte */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-rose-500" />
          <h2 className="font-heading text-lg font-semibold text-gray-900">
            Análise 80/20 — receita por destino
          </h2>
        </div>
        {destinos.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Sem receita atribuível a destinos. (Precisa de registos financeiros com contravalor AOA
            ligados a candidaturas com programa/destino.)
          </p>
        ) : (
          <ol className="space-y-2">
            {destinos.map((d, i) => {
              const noCore = i < corte80
              return (
                <li key={d.destino_id} className="flex items-center gap-3">
                  <span className="w-6 text-right text-xs font-medium text-gray-400">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800">
                        {d.pais}
                        {d.cidade ? ` · ${d.cidade}` : ''}
                        {noCore && (
                          <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            CORE 80%
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums text-gray-600">{aoa(d.receita_aoa)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn('h-full rounded-full', noCore ? 'bg-rose-500' : 'bg-gray-300')}
                        style={{ width: `${Math.min(100, d.pct_receita)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-14 text-right text-xs tabular-nums text-gray-400">
                    {d.pct_acumulada.toFixed(0)}%
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Filtros de segmento */}
      <div className="flex flex-wrap gap-1">
        {SEGMENTOS.map((seg) => (
          <button
            key={seg}
            onClick={() => setFiltro(seg)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filtro === seg
                ? 'border-rose-500 bg-rose-500 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {seg === 'todos' ? 'Todos' : SEG_LABEL[seg]}
            {seg !== 'todos' && contagens[seg] ? ` (${contagens[seg]})` : ''}
          </button>
        ))}
      </div>

      {/* Matriz RFV por lead */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Segmento</th>
              <th className="px-4 py-3 font-medium text-center">Recência (R)</th>
              <th className="px-4 py-3 font-medium text-center">Frequência (F)</th>
              <th className="px-4 py-3 font-medium text-center">Valor (V)</th>
              <th className="px-4 py-3 font-medium text-right">Valor AOA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  A carregar RFV…
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Sem leads neste segmento.
                </td>
              </tr>
            ) : (
              filtrados.map((l: RfvLead) => (
                <tr key={l.lead_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{l.lead_nome}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-block rounded-full border px-2 py-0.5 text-xs font-medium',
                        SEG_STYLE[l.segmento]
                      )}
                    >
                      {SEG_LABEL[l.segmento]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" title={`${l.recencia_dias} dias desde o último contacto`}>
                    <span className="text-rose-400">{scoreDots(l.r_score)}</span>
                  </td>
                  <td className="px-4 py-3 text-center" title={`${l.n_candidaturas} candidatura(s)`}>
                    <span className="text-rose-400">{scoreDots(l.f_score)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-rose-400">{scoreDots(l.v_score)}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{aoa(l.valor_aoa)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
