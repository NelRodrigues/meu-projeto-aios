'use client'

import { useEffect, useState, useCallback } from 'react'
import { Wallet, Plus, Loader2, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Pagamento {
  id: string
  valor: number
  tipo_bolo: string | null
  metodo: string | null
  data_pagamento: string
  estado: string | null
}

interface Produto {
  id: string
  nome: string
  valor: number | null
}

interface FinancialSectionProps {
  clienteId: string
  tenantId?: string | null
}

const METODOS = [
  { value: 'transferencia', label: 'Transferência' },
  { value: 'multicaixa_express', label: 'Multicaixa Express' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'outro', label: 'Outro' },
]

const ESTADOS = [
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'sinal', label: 'Sinal (parcial)' },
]

function formatKz(value: number): string {
  return new Intl.NumberFormat('pt-AO').format(value || 0) + ' Kz'
}
function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

export function FinancialSection({ clienteId, tenantId = null }: FinancialSectionProps) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [adicionando, setAdicionando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [form, setForm] = useState({
    tipo_bolo: '',
    valor: '',
    metodo: 'transferencia',
    estado: 'confirmado',
    data_pagamento: hoje(),
  })

  const supabase = createClient()

  const carregar = useCallback(async () => {
    setLoading(true)
    const [pgRes, prodRes] = await Promise.all([
      supabase
        .from('payments')
        .select('id,valor,tipo_bolo,metodo,data_pagamento,estado')
        .eq('contact_id', clienteId)
        .order('data_pagamento', { ascending: false }),
      supabase
        .from('products')
        .select('id,nome,valor')
        .eq('is_active', true)
        .order('valor', { ascending: true }),
    ])
    setPagamentos((pgRes.data as Pagamento[]) || [])
    setProdutos((prodRes.data as Produto[]) || [])
    setLoading(false)
  }, [supabase, clienteId])

  useEffect(() => { void carregar() }, [carregar])

  async function adicionar() {
    setErro(null)
    const valorNum = Number(form.valor)
    if (!form.tipo_bolo.trim()) { setErro('Indica o tipo de bolo.'); return }
    if (!valorNum || valorNum <= 0) { setErro('Indica um valor válido.'); return }
    setSaving(true)
    const payload: Record<string, unknown> = {
      contact_id: clienteId,
      tipo_bolo: form.tipo_bolo.trim(),
      valor: valorNum,
      metodo: form.metodo,
      estado: form.estado,
      data_pagamento: form.data_pagamento,
    }
    if (tenantId) payload.tenant_id = tenantId
    const { error } = await supabase.from('payments').insert(payload)
    setSaving(false)
    if (error) { setErro(`Falha ao registar: ${error.message}`); return }
    setForm({ tipo_bolo: '', valor: '', metodo: 'transferencia', estado: 'confirmado', data_pagamento: hoje() })
    setAdicionando(false)
    await carregar()
  }

  const totalConfirmado = pagamentos
    .filter(p => p.estado === 'confirmado')
    .reduce((s, p) => s + Number(p.valor || 0), 0)
  const totalPendente = pagamentos
    .filter(p => p.estado === 'pendente' || p.estado === 'sinal')
    .reduce((s, p) => s + Number(p.valor || 0), 0)

  // Mapa preço-catálogo por nome de bolo (para calcular valor em falta).
  const precoCatalogo = new Map<string, number>()
  for (const prod of produtos) {
    if (prod.valor) precoCatalogo.set(prod.nome, Number(prod.valor))
  }

  // Agrupar pagamentos por tipo de bolo para apurar quanto falta em cada um.
  interface ResumoBolo { tipo: string; total: number; pago: number; falta: number }
  const resumoPorBolo: ResumoBolo[] = []
  const porBolo = new Map<string, number>()
  for (const p of pagamentos) {
    const tipo = p.tipo_bolo || 'Pagamento'
    porBolo.set(tipo, (porBolo.get(tipo) || 0) + Number(p.valor || 0))
  }
  for (const [tipo, pago] of porBolo.entries()) {
    const total = precoCatalogo.get(tipo) ?? pago // se não há preço no catálogo, assume que já está pago
    resumoPorBolo.push({ tipo, total, pago, falta: Math.max(0, total - pago) })
  }
  const totalEmFalta = resumoPorBolo.reduce((s, r) => s + r.falta, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-rose-400" />
          Financeiro
        </h2>
        {!adicionando && (
          <button
            onClick={() => setAdicionando(true)}
            className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Registar pagamento
          </button>
        )}
      </div>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-sm font-bold text-emerald-700">{formatKz(totalConfirmado)}</p>
          <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Recebido
          </p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-sm font-bold text-amber-700">{formatKz(totalPendente)}</p>
          <p className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" /> Sinal/Pend.
          </p>
        </div>
        <div className={`rounded-lg p-3 ${totalEmFalta > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <p className={`text-sm font-bold ${totalEmFalta > 0 ? 'text-red-600' : 'text-gray-500'}`}>{formatKz(totalEmFalta)}</p>
          <p className={`text-[10px] font-medium flex items-center gap-1 ${totalEmFalta > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            <AlertCircle className="h-3 w-3" /> Em falta
          </p>
        </div>
      </div>

      {/* Resumo por bolo — quanto falta receber em cada encomenda */}
      {resumoPorBolo.some(r => r.falta > 0) && (
        <div className="mb-4 space-y-1.5">
          {resumoPorBolo.filter(r => r.falta > 0).map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-red-50/60 border border-red-100 rounded-lg px-2.5 py-1.5">
              <span className="text-gray-700 font-medium truncate pr-2">{r.tipo}</span>
              <span className="text-red-600 font-semibold whitespace-nowrap">
                Falta {formatKz(r.falta)}
                <span className="text-gray-400 font-normal"> / {formatKz(r.total)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {adicionando && (
        <div className="border border-rose-100 bg-rose-50/40 rounded-lg p-3 mb-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Novo pagamento</p>
            <button onClick={() => { setAdicionando(false); setErro(null) }} className="p-0.5 text-gray-400 hover:bg-white rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Tipo de bolo</label>
            <input
              list="produtos-list"
              value={form.tipo_bolo}
              onChange={e => {
                const nome = e.target.value
                const prod = produtos.find(p => p.nome === nome)
                setForm({ ...form, tipo_bolo: nome, valor: prod?.valor ? String(prod.valor) : form.valor })
              }}
              placeholder="Ex: Bento Cake, Bolo 16cm..."
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <datalist id="produtos-list">
              {produtos.map(p => <option key={p.id} value={p.nome} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Valor (Kz)</label>
              <input
                type="number"
                value={form.valor}
                onChange={e => setForm({ ...form, valor: e.target.value })}
                placeholder="0"
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Data</label>
              <input
                type="date"
                value={form.data_pagamento}
                onChange={e => setForm({ ...form, data_pagamento: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Método</label>
              <select
                value={form.metodo}
                onChange={e => setForm({ ...form, metodo: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Estado</label>
              <select
                value={form.estado}
                onChange={e => setForm({ ...form, estado: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          {erro && <p className="text-xs text-red-500">{erro}</p>}
          <button
            onClick={adicionar}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Registar
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-4"><Loader2 className="h-5 w-5 text-rose-300 mx-auto animate-spin" /></div>
      ) : pagamentos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum pagamento registado</p>
      ) : (
        <div className="space-y-2">
          {pagamentos.map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
              <div>
                <p className="text-gray-700 font-medium">{p.tipo_bolo || 'Pagamento'}</p>
                <p className="text-[11px] text-gray-400">
                  {new Date(p.data_pagamento).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {p.metodo && ` · ${METODOS.find(m => m.value === p.metodo)?.label || p.metodo}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800">{formatKz(Number(p.valor))}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  p.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-600'
                  : p.estado === 'sinal' ? 'bg-blue-100 text-blue-600'
                  : 'bg-amber-100 text-amber-600'
                }`}>
                  {ESTADOS.find(s => s.value === p.estado)?.label || p.estado || 'registado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
