'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Calendar, Clock, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Cliente, Produto, ModoEntrega } from '@/types/database'
import { isSharedBackendMode, PUBLIC_SHARED_TENANT_ID } from '@/lib/backend/config'

export function OrderForm() {
  const router = useRouter()
  const supabase = createClient()
  const sharedMode = isSharedBackendMode()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [sharedProductSuggestions, setSharedProductSuggestions] = useState<{ nome: string; count: number }[]>([])
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [showClienteList, setShowClienteList] = useState(false)
  const [produtoId, setProdutoId] = useState('')
  const [produtoTitulo, setProdutoTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tema, setTema] = useState('')
  const [tamanho, setTamanho] = useState('')
  const [saborMassa, setSaborMassa] = useState('')
  const [saborRecheio, setSaborRecheio] = useState('')
  const [decoracao, setDecoracao] = useState('')
  const [dataEntrega, setDataEntrega] = useState('')
  const [horaEntrega, setHoraEntrega] = useState('10:00')
  const [modoEntrega, setModoEntrega] = useState<ModoEntrega>('retirada')
  const [enderecoEntrega, setEnderecoEntrega] = useState('')
  const [valorOrcamento, setValorOrcamento] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sharedMode) {
      Promise.all([
        supabase.from('contacts').select('id,created_at,updated_at,nome,telefone,email,estagio,origem,notas,valor_total_pago,whatsapp_id').order('nome'),
        supabase.from('deals').select('id,title,status,total_paid,created_at,updated_at,lead_id,leads!lead_id(name,phone)').order('updated_at', { ascending: false }),
      ]).then(([{ data: c }, { data: d }]) => {
        if (c) {
          setClientes((c as Array<{
            id: string
            created_at: string
            updated_at: string
            nome: string
            telefone: string | null
            email: string | null
            estagio: string | null
            origem: string | null
            notas: string | null
            valor_total_pago: number | string | null
            whatsapp_id: string | null
          }>).map((item) => ({
            id: item.id,
            created_at: item.created_at,
            updated_at: item.updated_at,
            nome: item.nome,
            telefone: item.telefone,
            whatsapp_id: item.whatsapp_id,
            email: item.email,
            estagio: (item.estagio as Cliente['estagio']) || 'novo',
            origem: (item.origem as Cliente['origem']) || null,
            notas: item.notas,
            morada: null,
            data_aniversario: null,
            lead_intelligence: null,
            lead_intelligence_at: null,
            total_pedidos: item.valor_total_pago ? 1 : 0,
            total_gasto: typeof item.valor_total_pago === 'number' ? item.valor_total_pago : Number(item.valor_total_pago) || 0,
            ticket_medio: typeof item.valor_total_pago === 'number' ? item.valor_total_pago : Number(item.valor_total_pago) || 0,
            ultima_compra: null,
            criado_por_bot: false,
          })))
        }
        if (d) {
          const mapa = new Map<string, number>()
          for (const deal of d as Array<{ title: string | null }>) {
            const nome = (deal.title || '').trim()
            if (!nome) continue
            mapa.set(nome, (mapa.get(nome) || 0) + 1)
          }
          setSharedProductSuggestions(
            [...mapa.entries()]
              .map(([nome, count]) => ({ nome, count }))
              .sort((a, b) => b.count - a.count || a.nome.localeCompare(b.nome))
          )
        }
      })
      return
    }

    Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('produtos_catalogo').select('*').eq('activo', true).order('nome'),
    ]).then(([{ data: c }, { data: p }]) => {
      if (c) setClientes(c as Cliente[])
      if (p) setProdutos(p as Produto[])
    })
  }, [sharedMode, supabase])

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.telefone?.includes(clienteSearch)
  ).slice(0, 8)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clienteSelecionado) {
      setError('Selecciona um cliente')
      return
    }
    if (!dataEntrega) {
      setError('A data de entrega é obrigatória')
      return
    }
    const hoje = new Date().toISOString().split('T')[0]
    if (dataEntrega < hoje) {
      setError('A data de entrega não pode ser no passado')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // No shared mode, deals.lead_id aponta para a tabela `leads` (não `contacts`).
      // Garantimos/criamos o lead a partir do contacto seleccionado antes de criar o deal.
      let sharedLeadId: string | null = null
      if (sharedMode) {
        const tenantId = PUBLIC_SHARED_TENANT_ID || '81bc8777-39f3-477a-8ad6-44f9dcf1eca8'
        const telDigits = (clienteSelecionado.telefone || '').replace(/\D/g, '')
        if (telDigits.length >= 8) {
          const { data: leadExist } = await supabase
            .from('leads')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('phone', `%${telDigits.slice(-9)}%`)
            .limit(1)
            .maybeSingle()
          if (leadExist) sharedLeadId = (leadExist as { id: string }).id
        }
        if (!sharedLeadId) {
          const { data: leadNew, error: leadErr } = await supabase
            .from('leads')
            .insert({
              tenant_id: tenantId,
              name: clienteSelecionado.nome,
              phone: clienteSelecionado.telefone,
              source: 'crm_manual',
              metadata: { contact_id: clienteSelecionado.id },
            })
            .select('id')
            .single()
          if (leadErr) throw leadErr
          sharedLeadId = (leadNew as { id: string }).id
        }
      }

      const payload = sharedMode
        ? {
            lead_id: sharedLeadId,
            tenant_id: PUBLIC_SHARED_TENANT_ID || '81bc8777-39f3-477a-8ad6-44f9dcf1eca8',
            title: produtoTitulo.trim() || descricao.trim() || 'Pedido',
            status: 'proposal',
            total_paid: valorOrcamento ? parseFloat(valorOrcamento) : null,
            negotiated_price: valorOrcamento ? parseFloat(valorOrcamento) : null,
            expected_close_date: dataEntrega,
            notes: [
              descricao.trim() || null,
              tema.trim() ? `Tema: ${tema.trim()}` : null,
              tamanho.trim() ? `Tamanho: ${tamanho.trim()}` : null,
              saborMassa.trim() ? `Massa: ${saborMassa.trim()}` : null,
              saborRecheio.trim() ? `Recheio: ${saborRecheio.trim()}` : null,
              decoracao.trim() ? `Decoração: ${decoracao.trim()}` : null,
              notas.trim() || null,
            ].filter(Boolean).join(' | ') || null,
            payment_status: valorOrcamento ? 'pending' : null,
            metadata: { origem: 'crm_manual', contact_id: clienteSelecionado.id },
          }
        : {
            cliente_id: clienteSelecionado.id,
            produto_id: produtoId || null,
            descricao: descricao.trim() || null,
            tema: tema.trim() || null,
            tamanho: tamanho.trim() || null,
            sabor_massa: saborMassa.trim() || null,
            sabor_recheio: saborRecheio.trim() || null,
            decoracao: decoracao.trim() || null,
            data_entrega: dataEntrega,
            hora_entrega: horaEntrega || '10:00',
            modo_entrega: modoEntrega,
            endereco_entrega: modoEntrega === 'entrega' ? enderecoEntrega.trim() || null : null,
            valor_orcamento: valorOrcamento ? parseFloat(valorOrcamento) : null,
            notas: notas.trim() || null,
            estado: 'novo',
          }

      const { error: err } = await supabase.from(sharedMode ? 'deals' : 'pedidos').insert(payload as never)
      if (err) throw err
      router.push('/pedidos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Cliente */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Cliente *</label>
        {clienteSelecionado ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">{clienteSelecionado.nome}</p>
              {clienteSelecionado.telefone && (
                <p className="text-sm text-gray-500">{clienteSelecionado.telefone}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setClienteSelecionado(null); setClienteSearch('') }}
              className="text-sm text-rose-500 hover:text-rose-600"
            >
              Alterar
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={clienteSearch}
              onChange={(e) => { setClienteSearch(e.target.value); setShowClienteList(true) }}
              onFocus={() => setShowClienteList(true)}
              placeholder="Pesquisar cliente por nome ou telefone..."
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
            {showClienteList && clientesFiltrados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
                {clientesFiltrados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setClienteSelecionado(c); setShowClienteList(false) }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-rose-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                      {c.telefone && <p className="text-xs text-gray-500">{c.telefone}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Produto */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {sharedMode ? 'Produto / referência do pedido' : 'Produto do catálogo'}
        </label>
        {sharedMode ? (
          <>
            <input
              type="text"
              list="shared-product-suggestions"
              value={produtoTitulo}
              onChange={(e) => setProdutoTitulo(e.target.value)}
              placeholder="Ex: Bolo de aniversário, Bento Cake, Cupcakes..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
            <datalist id="shared-product-suggestions">
              {sharedProductSuggestions.map((p) => (
                <option key={p.nome} value={p.nome} />
              ))}
            </datalist>
            {sharedProductSuggestions.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Sugestões baseadas nos pedidos anteriores: {sharedProductSuggestions.slice(0, 5).map((p) => p.nome).join(' · ')}
              </p>
            )}
          </>
        ) : (
          <select
            value={produtoId}
            onChange={(e) => setProdutoId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          >
            <option value="">— Seleccionar produto (opcional) —</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}{p.preco_base ? ` — ${p.preco_base.toLocaleString('pt-AO')} Kz` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Descricao livre */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Descrição livre</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
          placeholder="Descrever o pedido em detalhe..."
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
      </div>

      {/* Detalhes — grid 2 colunas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tema</label>
          <input
            type="text"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ex: Frozen, Safari, Minimalista"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tamanho</label>
          <input
            type="text"
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
            placeholder="Ex: 16cm, médio, 2kg"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sabor da massa</label>
          <input
            type="text"
            value={saborMassa}
            onChange={(e) => setSaborMassa(e.target.value)}
            placeholder="Ex: Baunilha, Chocolate"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sabor do recheio</label>
          <input
            type="text"
            value={saborRecheio}
            onChange={(e) => setSaborRecheio(e.target.value)}
            placeholder="Ex: Morango, Nata"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </div>

      {/* Decoracao */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Decoração</label>
        <input
          type="text"
          value={decoracao}
          onChange={(e) => setDecoracao(e.target.value)}
          placeholder="Ex: Flores em chantilly, lettering personalizado"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
      </div>

      {/* Entrega */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Entrega</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Data *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-400"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Hora</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="time"
                value={horaEntrega}
                onChange={(e) => setHoraEntrega(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-400"
              />
            </div>
          </div>
        </div>

        {/* Modo entrega */}
        <div className="flex gap-3">
          {(['retirada', 'entrega'] as ModoEntrega[]).map((modo) => (
            <button
              key={modo}
              type="button"
              onClick={() => setModoEntrega(modo)}
              className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                modoEntrega === modo
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {modo === 'retirada' ? 'Retirada' : 'Entrega ao domicílio'}
            </button>
          ))}
        </div>

        {modoEntrega === 'entrega' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Endereço de entrega</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={enderecoEntrega}
                onChange={(e) => setEnderecoEntrega(e.target.value)}
                rows={2}
                placeholder="Bairro, rua, numero, referencias..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Financeiro */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Valor orçamento (Kz)</label>
        <input
          type="number"
          value={valorOrcamento}
          onChange={(e) => setValorOrcamento(e.target.value)}
          placeholder="Ex: 49500"
          min="0"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
      </div>

      {/* Notas */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notas internas</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          placeholder="Observacoes, alergias, preferencias do cliente..."
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
      </div>

      {/* Accoes */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-rose-500 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-600 disabled:opacity-50"
        >
          {saving ? 'A criar...' : 'Criar Pedido'}
        </button>
      </div>
    </form>
  )
}
