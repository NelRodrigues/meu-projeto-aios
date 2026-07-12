'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Trash2, Loader2, X, Shield, ShieldCheck, Eye, UserCog, Mail, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Membro {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  is_active: boolean
  auth_user_id: string | null
}

const PERFIS: { value: string; label: string; desc: string; icon: typeof Shield; cor: string }[] = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso total — gere equipa, agente e tudo', icon: ShieldCheck, cor: 'bg-rose-100 text-rose-700' },
  { value: 'gestor', label: 'Gestor', desc: 'Gere pedidos, clientes e catálogo', icon: UserCog, cor: 'bg-purple-100 text-purple-700' },
  { value: 'operador', label: 'Operador', desc: 'Atende inbox e regista pedidos', icon: Shield, cor: 'bg-blue-100 text-blue-700' },
  { value: 'visualizador', label: 'Visualizador', desc: 'Apenas vê, não edita', icon: Eye, cor: 'bg-gray-100 text-gray-600' },
]

function perfilInfo(role: string) {
  return PERFIS.find((p) => p.value === role) || PERFIS[2]
}

export default function EquipaPage() {
  const supabase = createClient()
  const [membros, setMembros] = useState<Membro[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formErro, setFormErro] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', perfil: 'operador', password: '' })
  const [euId, setEuId] = useState<string | null>(null)
  const [souAdmin, setSouAdmin] = useState(false)

  const fetchToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }, [supabase])

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setEuId(session?.user?.id || null)
      const role = (session?.user?.app_metadata as Record<string, unknown> | undefined)?.role
      setSouAdmin(role === 'admin')

      const res = await fetch('/api/equipa', { headers: { Authorization: `Bearer ${session?.access_token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar equipa')
      setMembros(json.membros || [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { void carregar() }, [carregar])

  async function adicionar() {
    setFormErro(null)
    if (!form.nome.trim()) { setFormErro('Indica o nome.'); return }
    if (!form.email.trim()) { setFormErro('Indica o email.'); return }
    if (form.password.length < 6) { setFormErro('A palavra-passe deve ter 6+ caracteres.'); return }
    setSaving(true)
    try {
      const token = await fetchToken()
      const res = await fetch('/api/equipa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao adicionar')
      setForm({ nome: '', email: '', telefone: '', perfil: 'operador', password: '' })
      setShowForm(false)
      await carregar()
    } catch (e) {
      setFormErro(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  async function mudarPerfil(m: Membro, perfil: string) {
    const token = await fetchToken()
    const res = await fetch(`/api/equipa/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ perfil }),
    })
    if (res.ok) setMembros((prev) => prev.map((x) => (x.id === m.id ? { ...x, role: perfil } : x)))
  }

  async function eliminar(m: Membro) {
    if (!window.confirm(`Eliminar ${m.name} (${m.email}) da equipa? A conta de acesso também será removida.`)) return
    const token = await fetchToken()
    const res = await fetch(`/api/equipa/${m.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { window.alert(json.error || 'Falha ao eliminar'); return }
    setMembros((prev) => prev.filter((x) => x.id !== m.id))
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-rose-400" /> Equipa
          </h1>
          <p className="mt-1 text-sm text-gray-500">Gere quem tem acesso ao CRM e os respectivos perfis.</p>
        </div>
        {souAdmin && !showForm && (
          <button
            onClick={() => { setForm({ nome: '', email: '', telefone: '', perfil: 'operador', password: '' }); setFormErro(null); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-600"
          >
            <Plus className="h-4 w-4" /> Adicionar membro
          </button>
        )}
      </div>

      {!souAdmin && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Só administradores podem gerir a equipa.
        </div>
      )}

      {/* Formulário de novo membro */}
      {showForm && (
        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Novo membro da equipa</h2>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Nome</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20" placeholder="membro@email.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Telefone (opcional)</label>
              <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20" placeholder="+244 9XX XXX XXX" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Palavra-passe inicial</label>
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20" placeholder="mínimo 6 caracteres" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Perfil de acesso</label>
            <div className="grid gap-2 md:grid-cols-2">
              {PERFIS.map((p) => {
                const Icon = p.icon
                const sel = form.perfil === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, perfil: p.value })}
                    className={cn('flex items-start gap-2 rounded-xl border p-3 text-left transition-colors', sel ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300')}
                  >
                    <Icon className={cn('mt-0.5 h-4 w-4', sel ? 'text-rose-500' : 'text-gray-400')} />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.label}</p>
                      <p className="text-xs text-gray-500">{p.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          {formErro && <p className="mt-3 text-xs text-red-500">{formErro}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={adicionar} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
            </button>
          </div>
        </div>
      )}

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{erro}</div>}

      {/* Lista de membros */}
      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-rose-400" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {membros.map((m) => {
            const info = perfilInfo(m.role)
            const Icon = info.icon
            const souEu = m.auth_user_id && m.auth_user_id === euId
            return (
              <div key={m.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-base font-bold text-rose-700">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{m.name}{souEu && <span className="ml-1 text-xs font-normal text-gray-400">(tu)</span>}</p>
                      <span className={cn('mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', info.cor)}>
                        <Icon className="h-3 w-3" /> {info.label}
                      </span>
                    </div>
                  </div>
                  {souAdmin && !souEu && (
                    <button onClick={() => eliminar(m)} title="Eliminar" className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gray-400" /> {m.email}</div>
                  {m.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" /> {m.phone}</div>}
                </div>
                {souAdmin && !souEu && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <label className="mb-1 block text-[11px] font-medium text-gray-400">Alterar perfil</label>
                    <select
                      value={m.role}
                      onChange={(e) => mudarPerfil(m, e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    >
                      {PERFIS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
