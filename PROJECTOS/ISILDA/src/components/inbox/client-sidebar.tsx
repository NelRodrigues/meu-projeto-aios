'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { Phone, Target, ArrowUpRight, MessageSquare, ExternalLink, CakeSlice, ShoppingBag, CalendarPlus } from 'lucide-react'
import type { ConversaActiva, ClienteEstagio } from '@/types/database'
import { OccasionsSection, type OccasionsSectionHandle } from '@/components/clientes/occasions-section'

interface ClientSidebarProps {
  conversa: ConversaActiva
}

const ESTAGIO_CONFIG: Record<ClienteEstagio, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-gray-100 text-gray-700' },
  contactado: { label: 'Contactado', color: 'bg-blue-100 text-blue-700' },
  orcamento: { label: 'Orcamento', color: 'bg-purple-100 text-purple-700' },
  activo: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
  vip: { label: 'VIP', color: 'bg-amber-100 text-amber-700' },
  inactivo: { label: 'Inactivo', color: 'bg-red-100 text-red-700' },
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
  const estagioKey = conversa.estagio as ClienteEstagio
  const estagio = ESTAGIO_CONFIG[estagioKey] || ESTAGIO_CONFIG.novo
  const ocasioesRef = useRef<OccasionsSectionHandle>(null)
  const nomeCliente = conversa.cliente_nome || 'Cliente sem nome'
  const avatar = nomeCliente.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-rose-100 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-2xl font-bold text-rose-700 mx-auto shadow-sm">
          {avatar}
        </div>
        <h3 className="mt-3 text-sm font-semibold text-gray-900 truncate">{nomeCliente}</h3>
        <span className={cn('inline-block mt-2 text-[10px] font-medium px-2.5 py-1 rounded-full', estagio.color)}>
          {estagio.label}
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
        <div className="flex items-center gap-2.5 py-1.5">
          <Target className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-700">WhatsApp</p>
        </div>
      </div>

      {/* Estatisticas */}
      <div className="px-5 py-4 border-b border-rose-100">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Estatisticas</h4>
        <StatItem
          icon={ArrowUpRight}
          label="Msgs enviadas"
          value={conversa.total_messages_sent}
          color="text-rose-500"
        />
        <StatItem
          icon={MessageSquare}
          label="Conversas activas"
          value={conversa.modo === 'bot' ? 'Bot' : 'Humano'}
          color="text-emerald-500"
        />
        <StatItem
          icon={CakeSlice}
          label="Estagio"
          value={estagio.label}
          color="text-amber-500"
        />
      </div>

      {/* Ocasioes */}
      <div className="px-5 py-4 border-b border-rose-100">
        <OccasionsSection ref={ocasioesRef} clienteId={conversa.cliente_id} compact />
      </div>

      {/* Accoes rapidas */}
      <div className="px-5 py-4 space-y-2">
        <a
          href={`/pedidos/novo?cliente=${conversa.cliente_id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-sm transition-colors"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Criar Pedido
        </a>
        <button
          type="button"
          onClick={() => ocasioesRef.current?.abrirForm()}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Registar Ocasião
        </button>
        <a
          href={`/clientes/${conversa.cliente_id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver perfil completo
        </a>
      </div>
    </div>
  )
}
