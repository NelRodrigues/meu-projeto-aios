'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Phone,
  CakeSlice,
  Edit,
  Save,
  X,
  MessageCircle,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react'
import type { Cliente, ClienteEstagio } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface ClientDetailProps {
  cliente: Cliente
  mensagensRecentes: {
    id: string
    created_at: string
    sender_type: string
    conteudo: string
    direction: string
  }[]
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

export function ClientDetail({ cliente: initialCliente, mensagensRecentes }: ClientDetailProps) {
  const [cliente, setCliente] = useState(initialCliente)
  const [editando, setEditando] = useState(false)
  const [notas, setNotas] = useState(cliente.notas || '')
  const [saving, setSaving] = useState(false)

  const estagioKey = cliente.estagio as ClienteEstagio
  const estagio = ESTAGIO_CONFIG[estagioKey] || ESTAGIO_CONFIG.novo

  async function handleSaveNotas() {
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('clientes')
      .update({ notas })
      .eq('id', cliente.id)
      .select()
      .single()
    if (data) setCliente({ ...cliente, notas: data.notas })
    setSaving(false)
    setEditando(false)
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
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CakeSlice className="h-4 w-4 text-rose-400" />
              Dados Pessoais
            </h2>
            {cliente.telefone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                {cliente.telefone}
              </div>
            )}
            <div className="text-xs text-gray-400">
              Cliente desde {formatDate(cliente.created_at)}
            </div>
            <div className="text-xs text-gray-400">
              Origem: {cliente.origem || 'WhatsApp'}
            </div>
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
        </div>

        {/* Coluna Direita — Historico de Mensagens */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <ShoppingBag className="h-4 w-4 text-rose-400" />
              Historico de Mensagens Recentes
            </h2>

            {mensagensRecentes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sem mensagens ainda</p>
            ) : (
              <div className="space-y-2">
                {mensagensRecentes.map(m => (
                  <div key={m.id} className={cn(
                    'flex gap-2 text-sm',
                    m.direction === 'incoming' ? 'flex-row' : 'flex-row-reverse'
                  )}>
                    <div className={cn(
                      'max-w-[80%] px-3 py-2 rounded-xl text-xs',
                      m.direction === 'incoming'
                        ? 'bg-gray-100 text-gray-700'
                        : m.sender_type === 'bot'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-500 text-white'
                    )}>
                      <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
                      <p className={cn(
                        'text-[10px] mt-1',
                        m.direction === 'incoming' ? 'text-gray-400' : m.sender_type === 'bot' ? 'text-emerald-500' : 'text-white/70'
                      )}>
                        {new Date(m.created_at).toLocaleString('pt-AO', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Africa/Luanda',
                        })}
                        {m.sender_type === 'bot' && ' • IA'}
                        {m.sender_type === 'humano' && ' • Isi'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
