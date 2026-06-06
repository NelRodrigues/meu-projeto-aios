'use client'

import { CreditCard, Calendar, MessageSquare, Cake } from 'lucide-react'
import Link from 'next/link'

interface UrgentActionsProps {
  pagamentosPendentes: { id: string; cliente_nome: string; valor: number; horas: number }[]
  entregasHoje: { id: string; cliente_nome: string; produto: string; hora: string }[]
  conversasPendentes: { id: string; cliente_nome: string }[]
  proximasOcasioes: { nome: string; tipo: string; dias: number }[]
}

export function UrgentActions({
  pagamentosPendentes,
  entregasHoje,
  conversasPendentes,
  proximasOcasioes,
}: UrgentActionsProps) {
  const total = pagamentosPendentes.length + entregasHoje.length + conversasPendentes.length

  if (total === 0 && proximasOcasioes.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-medium text-emerald-700">Tudo em dia! Sem acções urgentes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Pagamentos */}
      {pagamentosPendentes.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
          <CreditCard className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">{p.cliente_nome}</p>
            <p className="text-xs text-amber-600">
              Pagamento pendente — {p.valor.toLocaleString('pt-AO')} Kz
              {p.horas > 48 ? ` (há ${Math.floor(p.horas / 24)}d)` : ` (há ${p.horas}h)`}
            </p>
          </div>
          <Link href="/inbox" className="shrink-0 rounded-lg bg-amber-200 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-300">
            Ver
          </Link>
        </div>
      ))}

      {/* Entregas hoje */}
      {entregasHoje.map((e) => (
        <div key={e.id} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-3">
          <Calendar className="h-4 w-4 shrink-0 text-rose-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-rose-900">{e.cliente_nome}</p>
            <p className="text-xs text-rose-600">Entrega hoje {e.hora ? `às ${e.hora}` : ''} — {e.produto}</p>
          </div>
          <Link href="/pedidos" className="shrink-0 rounded-lg bg-rose-200 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-300">
            Ver
          </Link>
        </div>
      ))}

      {/* Conversas pendentes */}
      {conversasPendentes.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3">
          <MessageSquare className="h-4 w-4 shrink-0 text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900">
              {conversasPendentes.length} conversa{conversasPendentes.length !== 1 ? 's' : ''} à espera de resposta
            </p>
          </div>
          <Link href="/inbox" className="shrink-0 rounded-lg bg-orange-200 px-2 py-1 text-xs font-medium text-orange-800 hover:bg-orange-300">
            Inbox
          </Link>
        </div>
      )}

      {/* Proximas ocasioes */}
      {proximasOcasioes.slice(0, 3).map((o, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
          <Cake className="h-4 w-4 shrink-0 text-purple-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900">{o.nome}</p>
            <p className="text-xs text-purple-600">{o.tipo} — em {o.dias} dias</p>
          </div>
        </div>
      ))}
    </div>
  )
}
