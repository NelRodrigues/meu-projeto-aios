'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  BellRing,
  FileText,
  Users,
  CalendarClock,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFinanceiro, type FinanceiroRow } from '@/hooks/use-financeiro'
import { useCatalogo } from '@/hooks/use-catalogo'
import { totaisPorMoeda } from '@/lib/financeiro-validation'
import { FinanceiroForm } from '@/components/financeiro/financeiro-form'
import { FacturaForm, type FinanceiroOption } from '@/components/financeiro/factura-form'
import type {
  Financeiro,
  Factura,
  FacturaEstado,
  Candidatura,
} from '@/types/database'

const FIN_ESTADO_LABEL: Record<string, string> = {
  previsto: 'Previsto',
  facturado: 'Facturado',
  recebido: 'Recebido',
  anulado: 'Anulado',
}

const FACT_ESTADO_LABEL: Record<FacturaEstado, string> = {
  pendente: 'Pendente',
  enviada: 'Enviada',
  paga: 'Paga',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
}

const FACT_ESTADO_STYLE: Record<FacturaEstado, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  enviada: 'bg-blue-50 text-blue-700',
  paga: 'bg-green-50 text-green-700',
  vencida: 'bg-red-50 text-red-700',
  cancelada: 'bg-gray-100 text-gray-400 line-through',
}

const FMT = new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function money(n: number | null, cur: string | null): string {
  if (n == null) return '—'
  return `${FMT.format(n)}${cur ? ` ${cur}` : ''}`
}

type Aba = 'registos' | 'comissoes' | 'facturas'

export default function FinanceiroPage() {
  const {
    registos,
    facturas,
    loading,
    error,
    criarFinanceiro,
    actualizarFinanceiro,
    eliminarFinanceiro,
    criarFactura,
    actualizarFactura,
    mudarEstadoFactura,
    correrLembretesD5,
  } = useFinanceiro()
  const { parceiros, programas } = useCatalogo()

  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([])
  useEffect(() => {
    let activo = true
    const supabase = createClient()
    supabase
      .from('candidaturas')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (activo) setCandidaturas((data as Candidatura[]) || [])
      })
    return () => {
      activo = false
    }
  }, [])

  const [aba, setAba] = useState<Aba>('registos')
  const [finForm, setFinForm] = useState<{ open: boolean; edit?: Financeiro | null }>({ open: false })
  const [factForm, setFactForm] = useState<{ open: boolean; edit?: Factura | null }>({ open: false })
  const [d5Msg, setD5Msg] = useState<string | null>(null)

  // Opções de registo para o form de factura.
  const finOptions: FinanceiroOption[] = useMemo(
    () =>
      registos.map(r => ({
        id: r.id,
        valor: r.valor,
        currency: r.currency,
        lead_id: r.lead_id,
        parceiro_nome: r.parceiro_nome,
        tipo: r.tipo,
      })),
    [registos]
  )

  // ── Comissões por parceiro com totais POR MOEDA (AC5) ──────────────────────
  // Nunca soma moedas diferentes. O único agregado trans-moeda é contravalor_aoa.
  const comissoesPorParceiro = useMemo(() => {
    const comissoes = registos.filter(r => r.tipo === 'comissao')
    const grupos = new Map<string, { nome: string; registos: FinanceiroRow[] }>()
    for (const c of comissoes) {
      const key = c.parceiro_id ?? '__sem_parceiro__'
      const nome = c.parceiro_nome ?? 'Sem parceiro'
      if (!grupos.has(key)) grupos.set(key, { nome, registos: [] })
      grupos.get(key)!.registos.push(c)
    }
    return Array.from(grupos.values())
      .map(g => ({ nome: g.nome, n: g.registos.length, totais: totaisPorMoeda(g.registos) }))
      .sort((a, b) => b.totais.totalAoa - a.totais.totalAoa)
  }, [registos])

  // Totais globais dos registos (por moeda + AOA).
  const totaisGlobais = useMemo(() => totaisPorMoeda(registos), [registos])

  // ── Facturas a vencer (AC6) — próximas/vencidas, ordenadas por vencimento ──
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const facturasAVencer = useMemo(
    () =>
      facturas
        .filter(f => (f.estado === 'pendente' || f.estado === 'enviada'))
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [facturas]
  )

  async function handleD5() {
    setD5Msg(null)
    try {
      const n = await correrLembretesD5()
      setD5Msg(`Lembretes D-5 processados: ${n} nova(s) notificação(ões) criada(s).`)
    } catch (err) {
      setD5Msg(err instanceof Error ? err.message : 'Falha ao correr os lembretes D-5.')
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <ShieldAlert className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-gray-700">Sem acesso ao financeiro.</p>
        <p className="max-w-md text-center text-xs text-gray-500">
          O financeiro é dado sensível — visível apenas a administradores. {error}
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
            <Wallet className="h-6 w-6 text-rose-500" />
            <h1 className="font-heading text-2xl font-bold text-gray-900">Financeiro</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {registos.length} registos · {facturas.length} facturas ·{' '}
            contravalor AOA {money(totaisGlobais.totalAoa, 'AOA')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleD5}
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
            title="Corre a verificação de facturas a vencer (D-5) e cria as notificações internas"
          >
            <BellRing className="h-4 w-4" />
            Correr lembretes D-5
          </button>
          <button
            onClick={() => setFinForm({ open: true })}
            className="flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
          >
            <Plus className="h-4 w-4" />
            Novo registo
          </button>
        </div>
      </div>

      {d5Msg && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {d5Msg}
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          ['registos', 'Registos', Wallet],
          ['comissoes', 'Comissões por parceiro', Users],
          ['facturas', 'Facturas', FileText],
        ] as [Aba, string, typeof Wallet][]).map(([value, label, Icon]) => (
          <button
            key={value}
            onClick={() => setAba(value)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              aba === value
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">A carregar financeiro…</p>
      ) : aba === 'registos' ? (
        /* ── Registos financeiros por candidatura ── */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Lead / Candidatura</th>
                <th className="px-4 py-3 font-medium">Parceiro</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-4 py-3 font-medium text-right">Taxa</th>
                <th className="px-4 py-3 font-medium text-right">Contravalor AOA</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registos.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Sem registos financeiros. Cria o primeiro honorário ou comissão.
                  </td>
                </tr>
              )}
              {registos.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        r.tipo === 'comissao' ? 'bg-violet-50 text-violet-700' : 'bg-rose-50 text-rose-700'
                      )}
                    >
                      {r.tipo === 'comissao' ? 'Comissão' : 'Honorário'}
                      {r.tipo === 'comissao' && r.percentagem != null ? ` ${r.percentagem}%` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {r.lead_nome ?? '—'}
                    {r.candidatura_id && (
                      <span className="ml-1 text-xs text-gray-400">#{r.candidatura_id.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.parceiro_nome ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {money(r.valor, r.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {r.taxa_cambio_aoa != null ? FMT.format(r.taxa_cambio_aoa) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {r.contravalor_aoa != null ? (
                      money(r.contravalor_aoa, 'AOA')
                    ) : (
                      <span className="text-amber-600" title="Sem contravalor — não conta para o RFV">
                        por preencher
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{FIN_ESTADO_LABEL[r.estado]}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setFinForm({ open: true, edit: r })}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm('Eliminar este registo financeiro? As facturas ligadas caem também.'))
                            return
                          void eliminarFinanceiro(r.id)
                        }}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : aba === 'comissoes' ? (
        /* ── Comissões por parceiro com totais POR MOEDA ── */
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Totais segregados por moeda — moedas diferentes nunca são somadas. O único agregado
            trans-moeda é o contravalor AOA.
          </p>
          {comissoesPorParceiro.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">Sem comissões registadas.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comissoesPorParceiro.map(g => (
              <div key={g.nome} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{g.nome}</p>
                  <span className="text-xs text-gray-400">{g.n} comissão{g.n !== 1 ? 'ões' : ''}</span>
                </div>
                <div className="mt-3 space-y-1">
                  {Object.entries(g.totais.porMoeda).length === 0 && (
                    <p className="text-xs text-gray-400">Sem valores.</p>
                  )}
                  {Object.entries(g.totais.porMoeda)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([cur, tot]) => (
                      <div key={cur} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{cur}</span>
                        <span className="font-medium text-gray-900">{money(tot, cur)}</span>
                      </div>
                    ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-sm">
                  <span className="text-gray-500">Contravalor AOA</span>
                  <span className="font-semibold text-rose-600">{money(g.totais.totalAoa, 'AOA')}</span>
                </div>
                {g.totais.semContravalor > 0 && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    {g.totais.semContravalor} registo(s) sem contravalor (não contam no AOA).
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Facturas ── */
        <div className="space-y-5">
          {/* Quadro "facturas a vencer" (AC6) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="mb-2 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">Facturas a vencer</h3>
            </div>
            {facturasAVencer.length === 0 ? (
              <p className="text-xs text-amber-700">Nenhuma factura pendente ou enviada por vencer.</p>
            ) : (
              <ul className="space-y-1">
                {facturasAVencer.map(f => {
                  const atrasada = f.vencimento < hoje
                  return (
                    <li key={f.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {f.numero ?? '(sem número)'} · {money(f.valor, f.currency)}
                      </span>
                      <span className={cn('text-xs', atrasada ? 'font-semibold text-red-600' : 'text-amber-700')}>
                        vence {f.vencimento}
                        {atrasada ? ' · em atraso' : ''}
                        {f.lembrete_d5_enviado ? ' · lembrete enviado' : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setFactForm({ open: true })}
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              <Plus className="h-4 w-4" /> Nova factura
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facturas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Sem facturas.
                    </td>
                  </tr>
                )}
                {facturas.map(f => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{f.numero ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{money(f.valor, f.currency)}</td>
                    <td className="px-4 py-3 text-gray-600">{f.vencimento}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs', FACT_ESTADO_STYLE[f.estado])}>
                        {FACT_ESTADO_LABEL[f.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <select
                          value={f.estado}
                          onChange={e => void mudarEstadoFactura(f.id, e.target.value as FacturaEstado)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:border-rose-500 focus:outline-none"
                          title="Mudar estado"
                        >
                          {(Object.keys(FACT_ESTADO_LABEL) as FacturaEstado[]).map(s => (
                            <option key={s} value={s}>{FACT_ESTADO_LABEL[s]}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setFactForm({ open: true, edit: f })}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais */}
      {finForm.open && (
        <FinanceiroForm
          registo={finForm.edit}
          candidaturas={candidaturas}
          parceiros={parceiros}
          programas={programas}
          onClose={() => setFinForm({ open: false })}
          onSubmit={async data => {
            if (finForm.edit) await actualizarFinanceiro(finForm.edit.id, data)
            else await criarFinanceiro(data)
          }}
        />
      )}
      {factForm.open && (
        <FacturaForm
          factura={factForm.edit}
          registos={finOptions}
          onClose={() => setFactForm({ open: false })}
          onSubmit={async data => {
            if (factForm.edit) await actualizarFactura(factForm.edit.id, data)
            else await criarFactura(data)
          }}
        />
      )}
    </div>
  )
}
