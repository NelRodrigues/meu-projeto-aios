'use client'

import { cn } from '@/lib/utils'
import { Phone, ArrowUpRight, ExternalLink, MapPin, GraduationCap, Flame, FileText } from 'lucide-react'
import type { ConversaActiva, PipelineFase, Temperature } from '@/types/database'

interface ClientSidebarProps {
  conversa: ConversaActiva
}

// Fase do pipeline de candidatura (AC1) — rótulos pt-AO.
const FASE_CONFIG: Record<PipelineFase, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-gray-100 text-gray-700' },
  qualificado: { label: 'Qualificado', color: 'bg-blue-100 text-blue-700' },
  consulta_agendada: { label: 'Consulta agendada', color: 'bg-indigo-100 text-indigo-700' },
  proposta_enviada: { label: 'Proposta enviada', color: 'bg-purple-100 text-purple-700' },
  formalizacao_pagamento: { label: 'Formalização', color: 'bg-amber-100 text-amber-700' },
  candidatura_submetida: { label: 'Candidatura submetida', color: 'bg-cyan-100 text-cyan-700' },
  em_curso: { label: 'Em curso', color: 'bg-emerald-100 text-emerald-700' },
  concluido: { label: 'Concluído', color: 'bg-teal-100 text-teal-700' },
}

// Temperatura do lead (AC1) — cor semântica.
const TEMP_CONFIG: Record<Temperature, { label: string; color: string }> = {
  quente: { label: 'Quente', color: 'text-red-600' },
  morno: { label: 'Morno', color: 'text-amber-600' },
  frio: { label: 'Frio', color: 'text-blue-600' },
}

function StatItem({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', color || 'text-gray-400')} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-700">{value}</span>
    </div>
  )
}

export function ClientSidebar({ conversa }: ClientSidebarProps) {
  const fase = conversa.fase ? (FASE_CONFIG[conversa.fase] ?? FASE_CONFIG.lead) : FASE_CONFIG.lead
  const temp = conversa.temperature ? TEMP_CONFIG[conversa.temperature] : null
  const nomeCliente = conversa.cliente_nome || 'Cliente sem nome'
  const avatar = nomeCliente.charAt(0).toUpperCase()

  const bant = [
    conversa.bant_budget && { k: 'Orçamento', v: conversa.bant_budget },
    conversa.bant_authority && { k: 'Decisor', v: conversa.bant_authority },
    conversa.bant_need && { k: 'Necessidade', v: conversa.bant_need },
    conversa.bant_timeline && { k: 'Prazo', v: conversa.bant_timeline },
  ].filter(Boolean) as { k: string; v: string }[]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header — nome + fase do pipeline (AC1) */}
      <div className="p-5 border-b border-rose-100 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-2xl font-bold text-rose-700 mx-auto shadow-sm">
          {avatar}
        </div>
        <h3 className="mt-3 text-sm font-semibold text-gray-900 truncate">{nomeCliente}</h3>
        <span className={cn('inline-block mt-2 text-[10px] font-medium px-2.5 py-1 rounded-full', fase.color)}>
          {fase.label}
        </span>
      </div>

      {/* Contacto */}
      <div className="px-5 py-4 border-b border-rose-100">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Contacto</h4>
        {conversa.telefone && (
          <div className="flex items-center gap-2.5 py-1.5">
            <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700">{conversa.telefone}</p>
          </div>
        )}
      </div>

      {/* Qualificação — score + temperatura (AC1) */}
      <div className="px-5 py-4 border-b border-rose-100">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Qualificação</h4>
        <StatItem
          icon={ArrowUpRight}
          label="Score"
          value={typeof conversa.sales_score === 'number' ? `${conversa.sales_score}/100` : '—'}
          color="text-rose-500"
        />
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <Flame className={cn('h-3.5 w-3.5', temp?.color ?? 'text-gray-400')} />
            <span className="text-xs text-gray-500">Temperatura</span>
          </div>
          <span className={cn('text-sm font-medium', temp?.color ?? 'text-gray-400')}>
            {temp?.label ?? '—'}
          </span>
        </div>
      </div>

      {/* Projecto de estudo — destino/nível (AC1) */}
      {(conversa.destino || conversa.nivel) && (
        <div className="px-5 py-4 border-b border-rose-100">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Projecto de estudo</h4>
          {conversa.destino && (
            <div className="flex items-center gap-2.5 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-700">{conversa.destino}</p>
            </div>
          )}
          {conversa.nivel && (
            <div className="flex items-center gap-2.5 py-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-700">{conversa.nivel}</p>
            </div>
          )}
        </div>
      )}

      {/* BANT — o que se percebeu do lead (AC1) */}
      {bant.length > 0 && (
        <div className="px-5 py-4 border-b border-rose-100">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">BANT</h4>
          {bant.map((b) => (
            <div key={b.k} className="py-1">
              <span className="text-[10px] text-gray-400 block">{b.k}</span>
              <p className="text-xs text-gray-700">{b.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Acções rápidas — link para a ficha do lead */}
      <div className="px-5 py-4 space-y-2">
        <a
          href={`/clientes/${conversa.lead_id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver perfil completo
        </a>
        <a
          href={`/ficha?lead=${conversa.lead_id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Ficha do estudante
        </a>
      </div>
    </div>
  )
}
