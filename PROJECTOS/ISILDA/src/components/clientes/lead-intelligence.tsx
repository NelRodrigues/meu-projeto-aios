'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, TrendingUp, AlertTriangle, Target, Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeadIntelligenceData {
  resumo?: string
  perfil?: {
    temperatura?: string
    intencao_principal?: string
    preferencias?: string[]
    objeccoes?: string[]
  }
  score?: number
  score_justificacao?: string
  proximos_passos?: string[]
  oportunidades_upsell?: string[]
  datas_importantes?: string[]
  risco_churn?: string
  nota_interna?: string
}

interface LeadIntelligenceProps {
  clienteId: string
  inicial?: LeadIntelligenceData | null
  geradoEm?: string | null
}

const TEMP_COLOR: Record<string, string> = {
  QUENTE: 'bg-red-100 text-red-700',
  MORNO: 'bg-amber-100 text-amber-700',
  FRIO: 'bg-blue-100 text-blue-700',
}
const CHURN_COLOR: Record<string, string> = {
  ALTO: 'bg-red-100 text-red-700',
  MEDIO: 'bg-amber-100 text-amber-700',
  BAIXO: 'bg-emerald-100 text-emerald-700',
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Luanda' })
}

export function LeadIntelligence({ clienteId, inicial = null, geradoEm = null }: LeadIntelligenceProps) {
  const [data, setData] = useState<LeadIntelligenceData | null>(inicial)
  const [at, setAt] = useState<string | null>(geradoEm)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function gerar() {
    setLoading(true)
    setErro(null)
    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${supabaseUrl}/functions/v1/isilda-lead-intelligence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ contact_id: clienteId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Falha ao gerar inteligência')
      setData(json.intelligence)
      setAt(json.generated_at)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-rose-400" />
          Inteligência IA
        </h2>
        {data && (
          <button
            onClick={gerar}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerar
          </button>
        )}
      </div>

      {!data && !loading && (
        <div className="text-center py-6">
          <Sparkles className="h-8 w-8 text-rose-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-4">
            Gere insights completos sobre este lead usando IA
          </p>
          <button
            onClick={gerar}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Gerar Inteligência Completa
          </button>
          {erro && <p className="text-xs text-red-500 mt-3">{erro}</p>}
        </div>
      )}

      {loading && !data && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-rose-400 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-500">A analisar o lead com IA...</p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {at && <p className="text-[10px] text-gray-400">Gerado a {formatDateTime(at)}</p>}

          {/* Badges + Score */}
          <div className="flex flex-wrap items-center gap-2">
            {data.perfil?.temperatura && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TEMP_COLOR[data.perfil.temperatura] || 'bg-gray-100 text-gray-700'}`}>
                {data.perfil.temperatura}
              </span>
            )}
            {typeof data.score === 'number' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Score {data.score}
              </span>
            )}
            {data.risco_churn && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CHURN_COLOR[data.risco_churn] || 'bg-gray-100 text-gray-700'}`}>
                Churn {data.risco_churn}
              </span>
            )}
          </div>

          {data.resumo && (
            <p className="text-sm text-gray-700 leading-relaxed">{data.resumo}</p>
          )}

          {data.perfil?.intencao_principal && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">Intenção:</span> {data.perfil.intencao_principal}
            </div>
          )}

          {(data.perfil?.preferencias?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Preferências</p>
              <div className="flex flex-wrap gap-1">
                {data.perfil!.preferencias!.map((p, i) => (
                  <span key={i} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p}</span>
                ))}
              </div>
            </div>
          )}

          {(data.proximos_passos?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-rose-400" /> Próximos passos
              </p>
              <ul className="space-y-1">
                {data.proximos_passos!.map((p, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                    <span className="text-rose-400">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data.oportunidades_upsell?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <Gift className="h-3.5 w-3.5 text-amber-400" /> Oportunidades de upsell
              </p>
              <ul className="space-y-1">
                {data.oportunidades_upsell!.map((p, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                    <span className="text-amber-400">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data.datas_importantes?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Datas importantes</p>
              <div className="flex flex-wrap gap-1">
                {data.datas_importantes!.map((d, i) => (
                  <span key={i} className="text-[11px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{d}</span>
                ))}
              </div>
            </div>
          )}

          {data.nota_interna && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800 flex gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{data.nota_interna}</span>
              </p>
            </div>
          )}

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>
      )}
    </div>
  )
}
