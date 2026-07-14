'use client'

import { useState, useEffect } from 'react'
import { Shield, Search, AlertTriangle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ConsentRow {
  id: string
  cliente_id: string
  tipo: string
  consentido: boolean
  created_at: string
  clientes: { nome: string; telefone: string | null }
}

export default function RGPDPage() {
  const [consentimentos, setConsentimentos] = useState<ConsentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'revogados'>('todos')
  const [anonimizando, setAnonimizando] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('consentimentos')
      .select('*, clientes!cliente_id(nome, telefone)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setConsentimentos((data ?? []) as ConsentRow[])
        setLoading(false)
      })
  }, [supabase])

  const handleAnonimizar = async (clienteId: string, nomeCliente: string) => {
    const confirmacao1 = confirm(`Tens a certeza que queres anonimizar "${nomeCliente}"?\nEsta acção é IRREVERSÍVEL.`)
    if (!confirmacao1) return
    const confirmacao2 = confirm(`ATENÇÃO: Confirmas a anonimização de "${nomeCliente}"?\nTodos os dados pessoais serão removidos permanentemente.`)
    if (!confirmacao2) return

    setAnonimizando(clienteId)
    const { data, error } = await supabase.rpc('anonimizar_cliente', { p_cliente_id: clienteId })
    setAnonimizando(null)

    if (error) {
      alert(`Erro: ${error.message}`)
    } else {
      alert(`Cliente anonimizado com sucesso. ${data?.mensagens_anonimizadas ?? 0} mensagens removidas.`)
    }
  }

  const filtered = consentimentos.filter((c) => {
    if (filtro === 'activos' && !c.consentido) return false
    if (filtro === 'revogados' && c.consentido) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.clientes?.nome?.toLowerCase().includes(q) ||
        c.clientes?.telefone?.includes(q)
      )
    }
    return true
  })

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <Shield className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">RGPD / Privacidade</h1>
          <p className="text-sm text-gray-500">Gestão de consentimentos e dados pessoais</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex gap-2">
          {(['todos', 'activos', 'revogados'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors capitalize ${
                filtro === f ? 'bg-blue-500 text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">Nenhum consentimento encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center gap-3">
                {c.consentido ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.clientes?.nome ?? 'Anonimizado'}</p>
                  <p className="text-xs text-gray-500">
                    {c.clientes?.telefone ?? '—'} · {c.tipo} · {new Date(c.created_at).toLocaleDateString('pt-AO')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.consentido ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {c.consentido ? 'Consentido' : 'Revogado'}
                </span>
                {c.clientes?.nome && c.clientes.nome !== 'Cliente Anonimizado' && (
                  <button
                    onClick={() => handleAnonimizar(c.cliente_id, c.clientes.nome)}
                    disabled={anonimizando === c.cliente_id}
                    className="rounded-xl border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {anonimizando === c.cliente_id ? 'A anonimizar...' : 'Anonimizar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
