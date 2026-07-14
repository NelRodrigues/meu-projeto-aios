'use client'

// ============================================================
// Formulário público de ficha de estudante — story 2.4 AC4.
// ------------------------------------------------------------
// Rota pública (fora do grupo (dashboard)), link partilhável. Submete via
// POST /api/ficha-publica, que cria/actualiza lead + ficha e regista o
// consentimento. Sem dados de terceiros expostos: é só um formulário de entrada.
// ============================================================

import { useState } from 'react'
import { Loader2, GraduationCap, CheckCircle2 } from 'lucide-react'

interface FormState {
  nome: string
  telefone: string
  email: string
  nome_completo: string
  data_nascimento: string
  nacionalidade: string
  encarregado_nome: string
  encarregado_contacto: string
  encarregado_relacao: string
  percurso_academico: string
  nivel_linguistico: string
  destino_pretendido: string
  orcamento_faixa: string
}

const VAZIO: FormState = {
  nome: '',
  telefone: '',
  email: '',
  nome_completo: '',
  data_nascimento: '',
  nacionalidade: '',
  encarregado_nome: '',
  encarregado_contacto: '',
  encarregado_relacao: '',
  percurso_academico: '',
  nivel_linguistico: '',
  destino_pretendido: '',
  orcamento_faixa: '',
}

const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15'

export default function FichaPublicaPage() {
  const [form, setForm] = useState<FormState>(VAZIO)
  const [consentimento, setConsentimento] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  function set<K extends keyof FormState>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!form.nome.trim()) {
      setError('O nome é obrigatório.')
      return
    }
    if (!form.telefone.trim()) {
      setError('O telefone é obrigatório.')
      return
    }
    if (!consentimento) {
      setError('É necessário consentir o tratamento de dados pessoais.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/ficha-publica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, consentimento }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Falha ao submeter a ficha.')
        setSaving(false)
        return
      }
      setSucesso(true)
    } catch {
      setError('Falha de rede. Tenta novamente.')
      setSaving(false)
    }
  }

  if (sucesso) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 font-heading text-2xl font-bold text-gray-900">Ficha recebida!</h1>
          <p className="mt-2 text-sm text-gray-600">
            Obrigado. A equipa da Global Minds vai analisar os teus dados e entrar em contacto em breve.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white p-6">
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold text-gray-900">Ficha de Estudante</h1>
          <p className="mt-1 text-sm text-gray-500">
            Preenche os teus dados para começarmos o teu processo de estudo no estrangeiro.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm"
        >
          {/* Contacto */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Contacto</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Nome *</span>
                <input className={INPUT} value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Como te chamamos" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Telefone *</span>
                <input className={INPUT} type="tel" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="923 456 789" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <input className={INPUT} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@exemplo.com" />
              </label>
            </div>
          </section>

          {/* Dados pessoais */}
          <section className="space-y-4 border-t border-gray-100 pt-5">
            <h2 className="text-sm font-semibold text-gray-700">Dados pessoais</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Nome completo</span>
                <input className={INPUT} value={form.nome_completo} onChange={(e) => set('nome_completo', e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Data de nascimento</span>
                <input className={INPUT} type="date" value={form.data_nascimento} onChange={(e) => set('data_nascimento', e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Nacionalidade</span>
                <input className={INPUT} value={form.nacionalidade} onChange={(e) => set('nacionalidade', e.target.value)} placeholder="Angolana" />
              </label>
            </div>
          </section>

          {/* Encarregado */}
          <section className="space-y-4 border-t border-gray-100 pt-5">
            <h2 className="text-sm font-semibold text-gray-700">Encarregado de educação</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Nome</span>
                <input className={INPUT} value={form.encarregado_nome} onChange={(e) => set('encarregado_nome', e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Contacto</span>
                <input className={INPUT} value={form.encarregado_contacto} onChange={(e) => set('encarregado_contacto', e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Relação</span>
                <input className={INPUT} value={form.encarregado_relacao} onChange={(e) => set('encarregado_relacao', e.target.value)} placeholder="Pai, mãe, tutor..." />
              </label>
            </div>
          </section>

          {/* Percurso e destino */}
          <section className="space-y-4 border-t border-gray-100 pt-5">
            <h2 className="text-sm font-semibold text-gray-700">Percurso e destino</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-gray-700">Percurso académico</span>
                <textarea className={INPUT} rows={2} value={form.percurso_academico} onChange={(e) => set('percurso_academico', e.target.value)} placeholder="Habilitações, escola, área..." />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Nível linguístico</span>
                <input className={INPUT} value={form.nivel_linguistico} onChange={(e) => set('nivel_linguistico', e.target.value)} placeholder="Inglês B2, etc." />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Destino pretendido</span>
                <input className={INPUT} value={form.destino_pretendido} onChange={(e) => set('destino_pretendido', e.target.value)} placeholder="Portugal, Reino Unido..." />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Orçamento (faixa)</span>
                <input className={INPUT} value={form.orcamento_faixa} onChange={(e) => set('orcamento_faixa', e.target.value)} placeholder="Ex.: até 10.000 EUR/ano" />
              </label>
            </div>
          </section>

          {/* Consentimento */}
          <label className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={consentimento}
              onChange={(e) => setConsentimento(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-xs text-gray-600">
              Autorizo o tratamento dos meus dados pessoais pela Global Minds para efeitos de
              orientação e acompanhamento do processo de candidatura. *
            </span>
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A submeter...
              </>
            ) : (
              'Submeter ficha'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
