'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  AlertCircle,
  GraduationCap,
  ChevronRight,
  Globe,
  MapPin,
  Pencil,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCatalogo } from '@/hooks/use-catalogo'
import { ParceiroForm } from '@/components/catalogo/parceiro-form'
import { DestinoForm } from '@/components/catalogo/destino-form'
import { ProgramaForm } from '@/components/catalogo/programa-form'
import type { Parceiro, Destino, Programa, ProgramaTipo } from '@/types/database'

const TIPO_LABEL: Record<ProgramaTipo, string> = {
  summer_camp: 'Summer camp',
  linguas: 'Línguas',
  foundation: 'Foundation',
  licenciatura: 'Licenciatura',
  mestrado: 'Mestrado',
  voluntariado: 'Voluntariado',
  outro: 'Outro',
}

const TIPO_FILTER: { value: ProgramaTipo | ''; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  ...(Object.entries(TIPO_LABEL) as [ProgramaTipo, string][]).map(([value, label]) => ({ value, label })),
]

function faixaCusto(min: number | null, max: number | null, moeda: string | null): string {
  if (min == null && max == null) return '—'
  const fmt = (n: number) => new Intl.NumberFormat('pt-AO').format(n)
  const cur = moeda ? ` ${moeda}` : ''
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}${cur}`
  if (min != null) return `≥ ${fmt(min)}${cur}`
  return `≤ ${fmt(max as number)}${cur}`
}

export default function CatalogoPage() {
  const {
    parceiros,
    destinos,
    programas,
    loading,
    error,
    criarParceiro,
    actualizarParceiro,
    toggleParceiroActivo,
    criarDestino,
    actualizarDestino,
    criarPrograma,
    actualizarPrograma,
    toggleProgramaActivo,
  } = useCatalogo()

  // Drill-down: parceiro seleccionado → destino seleccionado.
  const [parceiroSel, setParceiroSel] = useState<string | null>(null)
  const [destinoSel, setDestinoSel] = useState<string | null>(null)

  // Filtros / pesquisa.
  const [search, setSearch] = useState('')
  const [filterPais, setFilterPais] = useState('')
  const [filterTipo, setFilterTipo] = useState<ProgramaTipo | ''>('')
  const [showInativos, setShowInativos] = useState(false)

  // Modais.
  const [parceiroForm, setParceiroForm] = useState<{ open: boolean; edit?: Parceiro | null }>({ open: false })
  const [destinoForm, setDestinoForm] = useState<{ open: boolean; edit?: Destino | null }>({ open: false })
  const [programaForm, setProgramaForm] = useState<{ open: boolean; edit?: Programa | null }>({ open: false })

  const paises = useMemo(
    () => Array.from(new Set(destinos.map(d => d.pais))).sort((a, b) => a.localeCompare(b)),
    [destinos]
  )

  const parceirosFiltrados = useMemo(() => {
    let r = [...parceiros]
    if (!showInativos) r = r.filter(p => p.is_active)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(p => p.nome.toLowerCase().includes(q) || (p.tipo ?? '').toLowerCase().includes(q))
    }
    // Se filtro por país activo, só parceiros com destino nesse país.
    if (filterPais) {
      const ids = new Set(destinos.filter(d => d.pais === filterPais).map(d => d.parceiro_id))
      r = r.filter(p => ids.has(p.id))
    }
    return r
  }, [parceiros, destinos, search, filterPais, showInativos])

  const destinosDoParceiro = useMemo(() => {
    if (!parceiroSel) return []
    let r = destinos.filter(d => d.parceiro_id === parceiroSel)
    if (filterPais) r = r.filter(d => d.pais === filterPais)
    return r
  }, [destinos, parceiroSel, filterPais])

  const programasDoDestino = useMemo(() => {
    if (!destinoSel) return []
    let r = programas.filter(p => p.destino_id === destinoSel)
    if (!showInativos) r = r.filter(p => p.is_active)
    if (filterTipo) r = r.filter(p => p.tipo === filterTipo)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(p => p.nome.toLowerCase().includes(q))
    }
    return r
  }, [programas, destinoSel, filterTipo, showInativos, search])

  const parceiroActual = parceiros.find(p => p.id === parceiroSel) ?? null
  const destinoActual = destinos.find(d => d.id === destinoSel) ?? null

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-rose-500" />
            <h1 className="font-heading text-2xl font-bold text-gray-900">Catálogo</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {parceiros.filter(p => p.is_active).length} parceiros · {destinos.length} destinos ·{' '}
            {programas.filter(p => p.is_active).length} programas
          </p>
        </div>
        <button
          onClick={() => setParceiroForm({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600"
        >
          <Plus className="h-4 w-4" />
          Novo parceiro
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <button
          onClick={() => {
            setParceiroSel(null)
            setDestinoSel(null)
          }}
          className={cn('hover:text-rose-600', !parceiroSel && 'font-medium text-gray-900')}
        >
          Parceiros
        </button>
        {parceiroActual && (
          <>
            <ChevronRight className="h-4 w-4" />
            <button
              onClick={() => setDestinoSel(null)}
              className={cn('hover:text-rose-600', !destinoSel && 'font-medium text-gray-900')}
            >
              {parceiroActual.nome}
            </button>
          </>
        )}
        {destinoActual && (
          <>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">
              {destinoActual.pais}
              {destinoActual.cidade ? ` · ${destinoActual.cidade}` : ''}
            </span>
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
        <select
          value={filterPais}
          onChange={e => setFilterPais(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 sm:w-48"
        >
          <option value="">Todos os países</option>
          {paises.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value as ProgramaTipo | '')}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 sm:w-44"
        >
          {TIPO_FILTER.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showInativos}
            onChange={e => setShowInativos(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-500/20"
          />
          Mostrar inactivos
        </label>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">A carregar catálogo…</p>
      ) : !parceiroSel ? (
        /* ── Nível 1: parceiros ── */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parceirosFiltrados.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-gray-400">Nenhum parceiro encontrado.</p>
          )}
          {parceirosFiltrados.map(p => {
            const nDestinos = destinos.filter(d => d.parceiro_id === p.id).length
            return (
              <div
                key={p.id}
                className={cn(
                  'rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm',
                  !p.is_active && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between">
                  <button onClick={() => setParceiroSel(p.id)} className="text-left">
                    <p className="font-medium text-gray-900">{p.nome}</p>
                    <p className="text-xs text-gray-500">{p.tipo ?? '—'}</p>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setParceiroForm({ open: true, edit: p })}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          p.is_active &&
                          !confirm(`Desactivar "${p.nome}"? Fica escondido mas é preservado.`)
                        )
                          return
                        void toggleParceiroActivo(p.id, !p.is_active)
                      }}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title={p.is_active ? 'Desactivar' : 'Reactivar'}
                    >
                      {p.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" /> {nDestinos} destino{nDestinos !== 1 ? 's' : ''}
                  </span>
                  {p.comissao_percent != null && <span>Comissão {p.comissao_percent}%</span>}
                </div>
                <button
                  onClick={() => setParceiroSel(p.id)}
                  className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Ver destinos <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      ) : !destinoSel ? (
        /* ── Nível 2: destinos do parceiro ── */
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setDestinoForm({ open: true })}
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              <Plus className="h-4 w-4" /> Novo destino
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {destinosDoParceiro.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-gray-400">
                Este parceiro ainda não tem destinos.
              </p>
            )}
            {destinosDoParceiro.map(d => {
              const nProgramas = programas.filter(pr => pr.destino_id === d.id).length
              return (
                <div key={d.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm">
                  <div className="flex items-start justify-between">
                    <button onClick={() => setDestinoSel(d.id)} className="text-left">
                      <p className="flex items-center gap-1 font-medium text-gray-900">
                        <MapPin className="h-4 w-4 text-rose-400" /> {d.pais}
                      </p>
                      <p className="text-xs text-gray-500">{d.cidade ?? 'Cidade não especificada'}</p>
                    </button>
                    <button
                      onClick={() => setDestinoForm({ open: true, edit: d })}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Custo de vida:{' '}
                    {d.custo_vida_faixa
                      ? `${d.custo_vida_faixa}${d.custo_vida_currency ? ` ${d.custo_vida_currency}` : ''}`
                      : '—'}
                  </div>
                  <button
                    onClick={() => setDestinoSel(d.id)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Ver programas ({nProgramas}) <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── Nível 3: programas do destino ── */
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setProgramaForm({ open: true })}
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              <Plus className="h-4 w-4" /> Novo programa
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Programa</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Faixa de custo</th>
                  <th className="px-4 py-3 font-medium">Duração</th>
                  <th className="px-4 py-3 font-medium">Comissão</th>
                  <th className="px-4 py-3 font-medium text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {programasDoDestino.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Nenhum programa neste destino.
                    </td>
                  </tr>
                )}
                {programasDoDestino.map(pr => (
                  <tr key={pr.id} className={cn(!pr.is_active && 'opacity-60')}>
                    <td className="px-4 py-3 font-medium text-gray-900">{pr.nome}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                        {TIPO_LABEL[pr.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {faixaCusto(pr.custo_min, pr.custo_max, pr.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{pr.duracao ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {pr.comissao_percent != null ? `${pr.comissao_percent}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setProgramaForm({ open: true, edit: pr })}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              pr.is_active &&
                              !confirm(`Desactivar "${pr.nome}"? Fica escondido mas é preservado.`)
                            )
                              return
                            void toggleProgramaActivo(pr.id, !pr.is_active)
                          }}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title={pr.is_active ? 'Desactivar' : 'Reactivar'}
                        >
                          {pr.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
      {parceiroForm.open && (
        <ParceiroForm
          parceiro={parceiroForm.edit}
          onClose={() => setParceiroForm({ open: false })}
          onSubmit={async data => {
            if (parceiroForm.edit) await actualizarParceiro(parceiroForm.edit.id, data)
            else await criarParceiro(data)
          }}
        />
      )}
      {destinoForm.open && parceiroSel && (
        <DestinoForm
          parceiroId={parceiroSel}
          destino={destinoForm.edit}
          onClose={() => setDestinoForm({ open: false })}
          onSubmit={async data => {
            if (destinoForm.edit) await actualizarDestino(destinoForm.edit.id, data)
            else await criarDestino(data)
          }}
        />
      )}
      {programaForm.open && destinoSel && (
        <ProgramaForm
          destinoId={destinoSel}
          programa={programaForm.edit}
          onClose={() => setProgramaForm({ open: false })}
          onSubmit={async data => {
            if (programaForm.edit) await actualizarPrograma(programaForm.edit.id, data)
            else await criarPrograma(data)
          }}
        />
      )}
    </div>
  )
}
