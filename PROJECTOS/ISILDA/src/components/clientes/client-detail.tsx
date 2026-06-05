'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Gift,
  CakeSlice,
  Edit,
  Save,
  X,
  MessageCircle,
  TrendingUp,
} from 'lucide-react'
import type { Cliente, ClienteEstagio } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { OccasionsSection } from './occasions-section'
import { LeadIntelligence } from './lead-intelligence'
import { FinancialSection } from './financial-section'
import { mapSharedContactStage } from '@/lib/backend/shared-mappers'

interface ClientDetailProps {
  cliente: Cliente
  mensagensRecentes: {
    id: string
    created_at: string
    sender_type: string
    conteudo: string
    direction: string
  }[]
  sharedMode?: boolean
  tenantId?: string | null
}

const ESTAGIO_CONFIG: Record<ClienteEstagio, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-gray-100 text-gray-700' },
  contactado: { label: 'Contactado', color: 'bg-blue-100 text-blue-700' },
  orcamento: { label: 'Orcamento', color: 'bg-purple-100 text-purple-700' },
  activo: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
  vip: { label: 'VIP', color: 'bg-amber-100 text-amber-700' },
  inactivo: { label: 'Inactivo', color: 'bg-red-100 text-red-700' },
}

function formatKz(value: number): string {
  if (!value) return '0 Kz'
  return new Intl.NumberFormat('pt-AO').format(value) + ' Kz'
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Estágios válidos consoante o backend. No shared (pipeline_stage) os valores
// são diferentes; mapeamos os rótulos PT mas guardamos o valor aceite pela BD.
const ESTAGIOS_STANDALONE: ClienteEstagio[] = ['novo', 'contactado', 'orcamento', 'activo', 'vip', 'inactivo']
const ESTAGIOS_SHARED = ['lead', 'qualificada', 'sessao_agendada', 'em_programa', 'comunidade', 'alumni']

// Rótulos PT para o pipeline_stage do backend partilhado.
const SHARED_STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualificada: 'Qualificado',
  sessao_agendada: 'Reunião agendada',
  em_programa: 'Cliente activo',
  comunidade: 'Recorrente',
  alumni: 'Antigo cliente',
}

// Mapeia o estágio mostrado no CRM (ClienteEstagio) de volta para o
// pipeline_stage aceite por contacts no backend partilhado.
const CRM_TO_PIPELINE: Record<string, string> = {
  novo: 'lead',
  contactado: 'qualificada',
  orcamento: 'sessao_agendada',
  activo: 'em_programa',
  vip: 'comunidade',
  inactivo: 'alumni',
}

export function ClientDetail({ cliente: initialCliente, mensagensRecentes, sharedMode = false, tenantId = null }: ClientDetailProps) {
  void mensagensRecentes // histórico migrou para o Inbox
  const [cliente, setCliente] = useState(initialCliente)
  const [editando, setEditando] = useState(false)
  const [notas, setNotas] = useState(cliente.notas || '')
  const [saving, setSaving] = useState(false)

  // Edição do perfil (Dados Pessoais).
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [erroPerfil, setErroPerfil] = useState<string | null>(null)
  // No shared mode o select usa valores de pipeline_stage; convertemos o
  // estágio mostrado (ClienteEstagio) para o valor real do backend.
  const estagioInicial = sharedMode
    ? (CRM_TO_PIPELINE[String(cliente.estagio)] || 'lead')
    : String(cliente.estagio || 'novo')

  const [form, setForm] = useState({
    nome: cliente.nome || '',
    telefone: cliente.telefone || '',
    email: cliente.email || '',
    morada: cliente.morada || '',
    data_aniversario: cliente.data_aniversario || '',
    estagio: estagioInicial,
  })

  const tabela = sharedMode ? 'contacts' : 'clientes'

  const estagioKey = cliente.estagio as ClienteEstagio
  const estagio = ESTAGIO_CONFIG[estagioKey] || ESTAGIO_CONFIG.novo

  async function handleSaveNotas() {
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from(tabela)
      .update({ notas })
      .eq('id', cliente.id)
      .select()
      .single()
    if (data) setCliente({ ...cliente, notas: (data as { notas: string | null }).notas })
    setSaving(false)
    setEditando(false)
  }

  function abrirEdicaoPerfil() {
    setForm({
      nome: cliente.nome || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      morada: cliente.morada || '',
      data_aniversario: cliente.data_aniversario || '',
      estagio: sharedMode
        ? (CRM_TO_PIPELINE[String(cliente.estagio)] || 'lead')
        : String(cliente.estagio || 'novo'),
    })
    setErroPerfil(null)
    setEditandoPerfil(true)
  }

  async function handleSavePerfil() {
    if (!form.nome.trim()) {
      setErroPerfil('O nome é obrigatório.')
      return
    }
    setSavingPerfil(true)
    setErroPerfil(null)
    const supabase = createClient()
    const payload: Record<string, unknown> = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      morada: form.morada.trim() || null,
      data_aniversario: form.data_aniversario || null,
      estagio: form.estagio,
    }
    const { data, error } = await supabase
      .from(tabela)
      .update(payload)
      .eq('id', cliente.id)
      .select()
      .single()
    setSavingPerfil(false)
    if (error) {
      setErroPerfil(`Falha ao guardar: ${error.message}`)
      return
    }
    if (data) {
      const row = data as Record<string, unknown>
      setCliente({
        ...cliente,
        nome: String(row.nome ?? form.nome),
        telefone: (row.telefone as string | null) ?? null,
        email: (row.email as string | null) ?? null,
        morada: (row.morada as string | null) ?? null,
        data_aniversario: (row.data_aniversario as string | null) ?? null,
        estagio: sharedMode
          ? mapSharedContactStage(String(row.estagio ?? form.estagio))
          : ((row.estagio as ClienteEstagio) ?? (form.estagio as ClienteEstagio)),
      })

      // Auto-criar/actualizar ocasião de aniversário para recompra automática.
      if (form.data_aniversario) {
        try {
          const mmdd = form.data_aniversario.slice(5, 10) // 'YYYY-MM-DD' → 'MM-DD'
          // Existe já uma ocasião automática de aniversário próprio?
          const { data: existente } = await supabase
            .from('ocasioes_cliente')
            .select('id')
            .eq('cliente_id', cliente.id)
            .eq('tipo', 'aniversario_proprio')
            .eq('origem', 'perfil_aniversario')
            .maybeSingle()

          const ocasiaoPayload: Record<string, unknown> = {
            cliente_id: cliente.id,
            tipo: 'aniversario_proprio',
            nome_pessoa: form.nome.trim() || cliente.nome,
            data_evento: mmdd,
            origem: 'perfil_aniversario',
            activo: true,
          }
          if (tenantId) ocasiaoPayload.tenant_id = tenantId

          if (existente?.id) {
            await supabase.from('ocasioes_cliente').update(ocasiaoPayload).eq('id', existente.id)
          } else {
            await supabase.from('ocasioes_cliente').insert(ocasiaoPayload)
          }
        } catch {
          // não-bloqueante — a edição do perfil não falha por causa da ocasião
        }
      }
    }
    setEditandoPerfil(false)
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/clientes"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-lg font-bold">
              {cliente.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-gray-900">{cliente.nome}</h1>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', estagio.color)}>
                {estagio.label}
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/inbox?cliente=${cliente.id}`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Ver Inbox
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda — Dados + Metricas */}
        <div className="lg:col-span-1 space-y-6">
          {/* Dados Pessoais */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CakeSlice className="h-4 w-4 text-rose-400" />
                Dados Pessoais
              </h2>
              {editandoPerfil ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSavePerfil}
                    disabled={savingPerfil}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                    title="Guardar"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setEditandoPerfil(false); setErroPerfil(null) }}
                    className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                    title="Cancelar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={abrirEdicaoPerfil}
                  className="p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-500 rounded transition-colors"
                  title="Editar perfil"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {editandoPerfil ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Nome</label>
                  <input
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Telefone</label>
                  <input
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="+244 9XX XXX XXX"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Morada</label>
                  <input
                    value={form.morada}
                    onChange={e => setForm({ ...form, morada: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="Bairro, rua, referência..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Data de aniversário</label>
                  <input
                    type="date"
                    value={form.data_aniversario}
                    onChange={e => setForm({ ...form, data_aniversario: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Estágio</label>
                  <select
                    value={form.estagio}
                    onChange={e => setForm({ ...form, estagio: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    {(sharedMode ? ESTAGIOS_SHARED : ESTAGIOS_STANDALONE).map(s => (
                      <option key={s} value={s}>
                        {sharedMode
                          ? (SHARED_STAGE_LABELS[s] || s)
                          : (ESTAGIO_CONFIG[s as ClienteEstagio]?.label || s)}
                      </option>
                    ))}
                  </select>
                </div>
                {erroPerfil && <p className="text-xs text-red-500">{erroPerfil}</p>}
              </div>
            ) : (
              <>
                {cliente.telefone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {cliente.telefone}
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {cliente.email}
                  </div>
                )}
                {cliente.morada && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {cliente.morada}
                  </div>
                )}
                {cliente.data_aniversario && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Gift className="h-3.5 w-3.5 text-gray-400" />
                    {formatDate(cliente.data_aniversario)}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  Cliente desde {formatDate(cliente.created_at)}
                </div>
                <div className="text-xs text-gray-400">
                  Origem: {cliente.origem || 'WhatsApp'}
                </div>
              </>
            )}
          </div>

          {/* Metricas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose-400" />
              Metricas
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-rose-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-rose-700">{cliente.total_pedidos || 0}</p>
                <p className="text-[10px] text-rose-500 font-medium">Pedidos</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-sm font-bold text-amber-700">{formatKz(cliente.total_gasto)}</p>
                <p className="text-[10px] text-amber-500 font-medium">Total Gasto</p>
              </div>
            </div>
            {cliente.ultima_compra && (
              <p className="text-xs text-gray-500">
                Ultima compra: {formatDate(cliente.ultima_compra)}
              </p>
            )}
          </div>

          {/* Notas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Notas</h2>
              {editando ? (
                <div className="flex items-center gap-1">
                  <button onClick={handleSaveNotas} disabled={saving} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                    <Save className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setEditando(false); setNotas(cliente.notas || '') }} className="p-1 text-gray-400 hover:bg-gray-50 rounded">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditando(true)} className="p-1 text-gray-400 hover:bg-gray-50 rounded">
                  <Edit className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {editando ? (
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Adicionar notas sobre o cliente..."
                rows={4}
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {cliente.notas || <span className="text-gray-400 italic">Sem notas</span>}
              </p>
            )}
          </div>
          {/* Ocasioes — key inclui o aniversário para recarregar após auto-criação */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <OccasionsSection key={`oc-${cliente.data_aniversario || 'none'}`} clienteId={cliente.id} />
          </div>
        </div>

        {/* Coluna Direita — Inteligência IA + Financeiro */}
        <div className="lg:col-span-2 space-y-6">
          <LeadIntelligence
            clienteId={cliente.id}
            inicial={(cliente.lead_intelligence as Parameters<typeof LeadIntelligence>[0]['inicial']) ?? null}
            geradoEm={cliente.lead_intelligence_at}
          />
          <FinancialSection clienteId={cliente.id} tenantId={tenantId} />
        </div>
      </div>
    </div>
  )
}
