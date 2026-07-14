'use client'

// ============================================================
// Ficha de estudante 360º — story 2.4 (AC1, AC2, AC3, AC5, AC6).
// ------------------------------------------------------------
// Secções: dados pessoais, encarregado, percurso, destino/programa, orçamento.
// Checklist documental sobre `fichas_estudante.documentos` (JSONB).
// Timeline unificada (interacoes + mudancas_estagio + mensagens_whatsapp).
// Toggle `processo_em_curso` com aviso de retenção de 2 anos.
// Painéis de financeiro (2.6) e emails (5.x) com degradação graciosa.
// ============================================================

import { useState } from 'react'
import {
  IdCard,
  Users,
  GraduationCap,
  Plane,
  Wallet,
  FileText,
  History,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  MessageCircle,
  ArrowRightLeft,
  Mail,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FichaEstudante, Programa } from '@/types/database'
import type { EventoTimeline, FonteEvento } from '@/lib/timeline-agregador'
import {
  ESTADOS_DOCUMENTO,
  ESTADO_LABEL,
  DOCUMENTOS_BASE,
  normalizarDocumentos,
  mudarEstadoDocumento,
  type DocumentoEstado,
  type DocumentoItem,
} from '@/lib/documentos'

type ProgramaOpcao = Pick<Programa, 'id' | 'nome' | 'tipo' | 'is_active'>

interface Ficha360Props {
  leadId: string
  fichaInicial: FichaEstudante | null
  programas: ProgramaOpcao[]
  timeline: EventoTimeline[]
}

const INPUT =
  'w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15'
const LABEL = 'block text-[11px] font-medium text-gray-500 mb-1'

const ESTADO_COR: Record<DocumentoEstado, string> = {
  em_falta: 'bg-gray-100 text-gray-600',
  recebido: 'bg-blue-100 text-blue-700',
  validado: 'bg-emerald-100 text-emerald-700',
  rejeitado: 'bg-red-100 text-red-700',
}

const FONTE_ICON: Record<FonteEvento, typeof MessageCircle> = {
  interacao: FileText,
  mudanca_estagio: ArrowRightLeft,
  mensagem_whatsapp: MessageCircle,
  email: Mail,
}

// Ficha em branco (lead ainda sem ficha) — todos os campos nulos/vazios.
function fichaVazia(leadId: string): FichaEstudante {
  return {
    id: '',
    created_at: '',
    updated_at: '',
    lead_id: leadId,
    nome_completo: null,
    data_nascimento: null,
    nacionalidade: null,
    encarregado_nome: null,
    encarregado_contacto: null,
    encarregado_relacao: null,
    percurso_academico: null,
    nivel_linguistico: null,
    destino_pretendido: null,
    programa_pretendido_id: null,
    orcamento_faixa: null,
    processo_em_curso: false,
    documentos: [],
    notas: null,
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Ficha360({ leadId, fichaInicial, programas, timeline }: Ficha360Props) {
  const supabase = createClient()

  const [ficha, setFicha] = useState<FichaEstudante>(fichaInicial ?? fichaVazia(leadId))
  const [documentos, setDocumentos] = useState<DocumentoItem[]>(
    normalizarDocumentos(fichaInicial?.documentos)
  )
  const [savingDados, setSavingDados] = useState(false)
  const [savingProcesso, setSavingProcesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome_completo: ficha.nome_completo ?? '',
    data_nascimento: ficha.data_nascimento ?? '',
    nacionalidade: ficha.nacionalidade ?? '',
    encarregado_nome: ficha.encarregado_nome ?? '',
    encarregado_contacto: ficha.encarregado_contacto ?? '',
    encarregado_relacao: ficha.encarregado_relacao ?? '',
    percurso_academico: ficha.percurso_academico ?? '',
    nivel_linguistico: ficha.nivel_linguistico ?? '',
    destino_pretendido: ficha.destino_pretendido ?? '',
    programa_pretendido_id: ficha.programa_pretendido_id ?? '',
    orcamento_faixa: ficha.orcamento_faixa ?? '',
  })

  function setCampo(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  // Upsert dos dados da ficha (1:1 com o lead — onConflict lead_id).
  async function guardarDados() {
    setSavingDados(true)
    setErro(null)
    setOkMsg(null)
    const payload = {
      lead_id: leadId,
      nome_completo: form.nome_completo.trim() || null,
      data_nascimento: form.data_nascimento || null,
      nacionalidade: form.nacionalidade.trim() || null,
      encarregado_nome: form.encarregado_nome.trim() || null,
      encarregado_contacto: form.encarregado_contacto.trim() || null,
      encarregado_relacao: form.encarregado_relacao.trim() || null,
      percurso_academico: form.percurso_academico.trim() || null,
      nivel_linguistico: form.nivel_linguistico.trim() || null,
      destino_pretendido: form.destino_pretendido.trim() || null,
      programa_pretendido_id: form.programa_pretendido_id || null,
      orcamento_faixa: form.orcamento_faixa.trim() || null,
    }
    const { data, error } = await supabase
      .from('fichas_estudante')
      .upsert(payload, { onConflict: 'lead_id' })
      .select('*')
      .single()
    setSavingDados(false)
    if (error) {
      setErro(`Falha ao guardar a ficha: ${error.message}`)
      return
    }
    if (data) setFicha(data as FichaEstudante)
    setOkMsg('Ficha guardada.')
  }

  // Garante que a ficha existe antes de mexer nos documentos/processo.
  async function garantirFicha(): Promise<boolean> {
    if (ficha.id) return true
    const { data, error } = await supabase
      .from('fichas_estudante')
      .upsert({ lead_id: leadId }, { onConflict: 'lead_id' })
      .select('*')
      .single()
    if (error || !data) {
      setErro(`Não foi possível criar a ficha: ${error?.message ?? 'desconhecido'}`)
      return false
    }
    setFicha(data as FichaEstudante)
    return true
  }

  async function persistirDocumentos(novos: DocumentoItem[]) {
    setErro(null)
    if (!(await garantirFicha())) return
    const { error } = await supabase
      .from('fichas_estudante')
      .update({ documentos: novos })
      .eq('lead_id', leadId)
    if (error) {
      setErro(`Falha ao guardar documentos: ${error.message}`)
      return
    }
    setDocumentos(novos)
  }

  // Muda o estado de um item (enum documento_estado) e actualiza updated_at.
  async function mudarEstado(index: number, novoEstado: DocumentoEstado) {
    const novos = mudarEstadoDocumento(documentos, index, novoEstado)
    await persistirDocumentos(novos)
  }

  async function adicionarDocumento(tipo: string) {
    if (!tipo.trim()) return
    const novos: DocumentoItem[] = [
      ...documentos,
      { tipo: tipo.trim(), estado: 'em_falta', url: null, updated_at: new Date().toISOString() },
    ]
    await persistirDocumentos(novos)
  }

  async function editarUrl(index: number, url: string) {
    const novos = documentos.map((d, i) =>
      i === index ? { ...d, url: url.trim() || null, updated_at: new Date().toISOString() } : d
    )
    await persistirDocumentos(novos)
  }

  // Toggle processo_em_curso (AC5) — bloqueia a retenção de 2 anos.
  async function toggleProcesso() {
    setSavingProcesso(true)
    setErro(null)
    if (!(await garantirFicha())) {
      setSavingProcesso(false)
      return
    }
    const novo = !ficha.processo_em_curso
    const { data, error } = await supabase
      .from('fichas_estudante')
      .update({ processo_em_curso: novo })
      .eq('lead_id', leadId)
      .select('*')
      .single()
    setSavingProcesso(false)
    if (error) {
      setErro(`Falha ao actualizar o processo: ${error.message}`)
      return
    }
    if (data) setFicha(data as FichaEstudante)
  }

  const [novoTipoDoc, setNovoTipoDoc] = useState('')
  const tiposExistentes = new Set(documentos.map((d) => d.tipo.toLowerCase()))
  const sugestoes = DOCUMENTOS_BASE.filter((t) => !tiposExistentes.has(t.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <IdCard className="h-5 w-5 text-rose-500" />
        <h2 className="font-heading text-lg font-bold text-gray-900">Ficha 360º do Estudante</h2>
      </div>

      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}
      {okMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {okMsg}
        </div>
      )}

      {/* ── Toggle processo_em_curso (AC5) ─────────────────────────── */}
      <div
        className={`rounded-xl border p-4 ${
          ficha.processo_em_curso ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Processo em curso</p>
            {ficha.processo_em_curso ? (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Enquanto activo, este contacto está <strong>EXCLUÍDO</strong> da rotina de retenção de 2 anos.
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Activa quando o estudante tiver um processo a decorrer (bloqueia a anonimização automática).
              </p>
            )}
          </div>
          <button
            onClick={toggleProcesso}
            disabled={savingProcesso}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              ficha.processo_em_curso ? 'bg-amber-500' : 'bg-gray-300'
            }`}
            aria-pressed={ficha.processo_em_curso}
            aria-label="Alternar processo em curso"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                ficha.processo_em_curso ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Dados pessoais ─────────────────────────────────────── */}
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <IdCard className="h-4 w-4 text-rose-400" /> Dados pessoais
          </h3>
          <div>
            <label className={LABEL}>Nome completo</label>
            <input className={INPUT} value={form.nome_completo} onChange={(e) => setCampo('nome_completo', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Data de nascimento</label>
              <input className={INPUT} type="date" value={form.data_nascimento} onChange={(e) => setCampo('data_nascimento', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Nacionalidade</label>
              <input className={INPUT} value={form.nacionalidade} onChange={(e) => setCampo('nacionalidade', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Encarregado ────────────────────────────────────────── */}
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Users className="h-4 w-4 text-rose-400" /> Encarregado de educação
          </h3>
          <div>
            <label className={LABEL}>Nome</label>
            <input className={INPUT} value={form.encarregado_nome} onChange={(e) => setCampo('encarregado_nome', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Contacto</label>
              <input className={INPUT} value={form.encarregado_contacto} onChange={(e) => setCampo('encarregado_contacto', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Relação</label>
              <input className={INPUT} value={form.encarregado_relacao} onChange={(e) => setCampo('encarregado_relacao', e.target.value)} placeholder="Pai, mãe, tutor..." />
            </div>
          </div>
        </div>

        {/* ── Percurso académico ─────────────────────────────────── */}
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <GraduationCap className="h-4 w-4 text-rose-400" /> Percurso académico
          </h3>
          <div>
            <label className={LABEL}>Percurso</label>
            <textarea className={INPUT} rows={2} value={form.percurso_academico} onChange={(e) => setCampo('percurso_academico', e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Nível linguístico</label>
            <input className={INPUT} value={form.nivel_linguistico} onChange={(e) => setCampo('nivel_linguistico', e.target.value)} placeholder="Inglês B2, etc." />
          </div>
        </div>

        {/* ── Destino / programa + orçamento ─────────────────────── */}
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Plane className="h-4 w-4 text-rose-400" /> Destino e programa
          </h3>
          <div>
            <label className={LABEL}>Destino pretendido</label>
            <input className={INPUT} value={form.destino_pretendido} onChange={(e) => setCampo('destino_pretendido', e.target.value)} placeholder="País/cidade (campo livre)" />
          </div>
          <div>
            <label className={LABEL}>Programa do catálogo</label>
            <select
              className={INPUT}
              value={form.programa_pretendido_id}
              onChange={(e) => setCampo('programa_pretendido_id', e.target.value)}
            >
              <option value="">— Sem programa definido —</option>
              {programas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.tipo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>
              <Wallet className="mr-1 inline h-3 w-3" /> Orçamento (faixa — nunca valor exacto)
            </label>
            <input className={INPUT} value={form.orcamento_faixa} onChange={(e) => setCampo('orcamento_faixa', e.target.value)} placeholder="Ex.: até 10.000 EUR/ano" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={guardarDados}
          disabled={savingDados}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-60"
        >
          {savingDados ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar dados da ficha
        </button>
      </div>

      {/* ── Checklist documental (AC2) ─────────────────────────────── */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <FileText className="h-4 w-4 text-rose-400" /> Checklist documental
        </h3>

        {documentos.length === 0 ? (
          <p className="text-xs italic text-gray-400">Sem documentos na checklist.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {documentos.map((doc, i) => (
              <li key={`${doc.tipo}-${i}`} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-[10rem] flex-1 text-sm font-medium text-gray-800">{doc.tipo}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_COR[doc.estado]}`}>
                  {ESTADO_LABEL[doc.estado]}
                </span>
                <select
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-rose-400"
                  value={doc.estado}
                  onChange={(e) => mudarEstado(i, e.target.value as DocumentoEstado)}
                >
                  {ESTADOS_DOCUMENTO.map((s) => (
                    <option key={s} value={s}>
                      {ESTADO_LABEL[s]}
                    </option>
                  ))}
                </select>
                <input
                  className="w-40 rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-rose-400"
                  placeholder="URL do documento"
                  defaultValue={doc.url ?? ''}
                  onBlur={(e) => {
                    if ((e.target.value.trim() || null) !== doc.url) editarUrl(i, e.target.value)
                  }}
                />
                <span className="text-[10px] text-gray-400">{formatDateTime(doc.updated_at)}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Adicionar documento */}
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <input
            className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-rose-400"
            placeholder="Novo tipo de documento"
            value={novoTipoDoc}
            onChange={(e) => setNovoTipoDoc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                adicionarDocumento(novoTipoDoc)
                setNovoTipoDoc('')
              }
            }}
          />
          <button
            onClick={() => {
              adicionarDocumento(novoTipoDoc)
              setNovoTipoDoc('')
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
        {sugestoes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sugestoes.map((s) => (
              <button
                key={s}
                onClick={() => adicionarDocumento(s)}
                className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 hover:border-rose-300 hover:text-rose-600"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Timeline unificada (AC3) ───────────────────────────────── */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <History className="h-4 w-4 text-rose-400" /> Histórico unificado
        </h3>
        {timeline.length === 0 ? (
          <p className="text-xs italic text-gray-400">Sem eventos registados para este contacto.</p>
        ) : (
          <ol className="space-y-3">
            {timeline.map((ev) => {
              const Icon = FONTE_ICON[ev.fonte] ?? FileText
              return (
                <li key={ev.id} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800">{ev.titulo}</p>
                      <span className="shrink-0 text-[10px] text-gray-400">{formatDateTime(ev.timestamp)}</span>
                    </div>
                    {ev.descricao && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">{ev.descricao}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* ── Painéis com degradação graciosa (AC6) ──────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-center">
          <Wallet className="mx-auto h-5 w-5 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-500">Financeiro</p>
          <p className="text-xs text-gray-400">Disponível em breve (story 2.6).</p>
        </div>
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-center">
          <Mail className="mx-auto h-5 w-5 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-500">Emails</p>
          <p className="text-xs text-gray-400">Disponível em breve (Épico 5).</p>
        </div>
      </div>
    </div>
  )
}
