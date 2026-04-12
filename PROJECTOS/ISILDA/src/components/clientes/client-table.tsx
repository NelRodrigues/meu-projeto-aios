'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Cliente, ClienteEstagio } from '@/types/database'

interface ClientTableProps {
  clientes: Cliente[]
  loading?: boolean
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
  if (!value) return '—'
  return new Intl.NumberFormat('pt-AO', { style: 'decimal', maximumFractionDigits: 0 }).format(value) + ' Kz'
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function ClientTable({ clientes, loading }: ClientTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-8 text-center text-sm text-gray-400 animate-pulse">
          A carregar clientes...
        </div>
      </div>
    )
  }

  if (clientes.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-8 text-center text-sm text-gray-400">
          Nenhum cliente encontrado
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Desktop table */}
      <table className="hidden sm:table w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefone</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estagio</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Gasto</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedidos</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ultima Compra</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {clientes.map(c => {
            const estagioKey = c.estagio as ClienteEstagio
            const estagio = ESTAGIO_CONFIG[estagioKey] || ESTAGIO_CONFIG.novo
            return (
              <tr key={c.id} className="hover:bg-rose-50/30 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800 group-hover:text-rose-600 transition-colors">{c.nome}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.telefone || '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', estagio.color)}>
                    {estagio.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-700">{formatKz(c.total_gasto)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{c.total_pedidos || 0}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(c.ultima_compra)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-gray-100">
        {clientes.map(c => {
          const estagioKey = c.estagio as ClienteEstagio
          const estagio = ESTAGIO_CONFIG[estagioKey] || ESTAGIO_CONFIG.novo
          return (
            <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-rose-50/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {c.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800 truncate">{c.nome}</span>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-2', estagio.color)}>
                    {estagio.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400">{c.telefone || 'Sem telefone'}</span>
                  <span className="text-xs text-gray-400">{formatKz(c.total_gasto)}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
