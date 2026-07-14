'use client'

import { useState, useMemo } from 'react'
import { Modal, inputClass, labelClass, FieldError } from '@/components/catalogo/modal'
import { validateFinanceiro, calcularContravalorAoa } from '@/lib/financeiro-validation'
import type {
  Financeiro,
  FinanceiroTipo,
  FinanceiroEstado,
  Parceiro,
  Programa,
  Candidatura,
} from '@/types/database'

const TIPOS: { value: FinanceiroTipo; label: string }[] = [
  { value: 'honorario', label: 'Honorário' },
  { value: 'comissao', label: 'Comissão' },
]

const ESTADOS: { value: FinanceiroEstado; label: string }[] = [
  { value: 'previsto', label: 'Previsto' },
  { value: 'facturado', label: 'Facturado' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'anulado', label: 'Anulado' },
]

interface Props {
  registo?: Financeiro | null
  candidaturas: Candidatura[]
  parceiros: Parceiro[]
  programas: Programa[]
  onClose: () => void
  onSubmit: (data: Partial<Financeiro>) => Promise<void>
}

// Formulário criar/editar registo financeiro (story 2.6).
// - moeda validada (3 letras maiúsculas)
// - taxa de câmbio EDITÁVEL (input manual — nunca buscada nem inventada)
// - contravalor AOA pré-calculado (valor × taxa) mas AJUSTÁVEL
// - ao escolher parceiro numa comissão, pré-preenche `percentagem` com
//   comissao_percent do programa (override) ou do parceiro
export function FinanceiroForm({
  registo,
  candidaturas,
  parceiros,
  programas,
  onClose,
  onSubmit,
}: Props) {
  const [candidaturaId, setCandidaturaId] = useState(registo?.candidatura_id ?? '')
  const [parceiroId, setParceiroId] = useState(registo?.parceiro_id ?? '')
  const [tipo, setTipo] = useState<FinanceiroTipo>(registo?.tipo ?? 'honorario')
  const [valor, setValor] = useState(registo?.valor != null ? String(registo.valor) : '')
  const [moeda, setMoeda] = useState(registo?.currency ?? '')
  const [taxa, setTaxa] = useState(registo?.taxa_cambio_aoa != null ? String(registo.taxa_cambio_aoa) : '')
  // contravalor: começa com o valor guardado (ou pré-cálculo). O utilizador pode ajustar.
  const [contravalor, setContravalor] = useState(
    registo?.contravalor_aoa != null ? String(registo.contravalor_aoa) : ''
  )
  // controla se o utilizador já mexeu manualmente no contravalor (deixa de auto-calcular)
  const [contravalorTocado, setContravalorTocado] = useState(false)
  const [percentagem, setPercentagem] = useState(
    registo?.percentagem != null ? String(registo.percentagem) : ''
  )
  const [estado, setEstado] = useState<FinanceiroEstado>(registo?.estado ?? 'previsto')
  const [notas, setNotas] = useState(registo?.notas ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Pré-cálculo do contravalor à medida que valor/taxa mudam (só enquanto o
  // utilizador não editou o contravalor à mão).
  const contravalorSugerido = useMemo(() => {
    const v = valor.trim() ? Number(valor) : null
    const t = taxa.trim() ? Number(taxa) : null
    return calcularContravalorAoa(v, t)
  }, [valor, taxa])

  // O valor efectivo mostrado no input de contravalor.
  const contravalorMostrado =
    contravalorTocado || contravalor.trim()
      ? contravalor
      : contravalorSugerido != null
        ? String(contravalorSugerido)
        : ''

  // Ao escolher parceiro numa comissão, pré-preenche a percentagem se estiver vazia.
  function aoEscolherParceiro(novoParceiroId: string) {
    setParceiroId(novoParceiroId)
    if (tipo !== 'comissao') return
    if (percentagem.trim()) return // não sobrepor edição do utilizador
    const parceiro = parceiros.find(p => p.id === novoParceiroId)
    // override do programa quando exista (via candidatura seleccionada)
    const candidatura = candidaturas.find(c => c.id === candidaturaId)
    const programa = candidatura?.programa_id
      ? programas.find(pr => pr.id === candidatura.programa_id)
      : undefined
    const pct = programa?.comissao_percent ?? parceiro?.comissao_percent ?? null
    if (pct != null) setPercentagem(String(pct))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const moedaNorm = moeda.trim().toUpperCase()
    const valorNum = valor.trim() ? Number(valor) : null
    const pctNum = percentagem.trim() ? Number(percentagem) : null

    const val = validateFinanceiro({
      tipo,
      valor: valorNum,
      currency: moedaNorm || null,
      percentagem: pctNum,
    })
    setErrors(val)
    if (Object.keys(val).length > 0) return

    // contravalor: usa o que está no input (ajustado ou sugerido). Se vazio, null.
    const contravalorFinal = contravalorMostrado.trim() ? Number(contravalorMostrado) : null

    setSaving(true)
    try {
      await onSubmit({
        candidatura_id: candidaturaId || null,
        parceiro_id: parceiroId || null,
        // lead_id herda da candidatura quando exista (a página resolve o lead_id)
        lead_id: candidaturas.find(c => c.id === candidaturaId)?.lead_id ?? null,
        tipo,
        valor: valorNum as number,
        currency: moedaNorm,
        taxa_cambio_aoa: taxa.trim() ? Number(taxa) : null,
        contravalor_aoa: contravalorFinal,
        percentagem: tipo === 'comissao' ? pctNum : null,
        estado,
        notas: notas.trim() || null,
      })
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={registo ? 'Editar registo financeiro' : 'Novo registo financeiro'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo *</label>
            <select
              className={inputClass}
              value={tipo}
              onChange={e => setTipo(e.target.value as FinanceiroTipo)}
            >
              {TIPOS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <FieldError message={errors.tipo} />
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <select
              className={inputClass}
              value={estado}
              onChange={e => setEstado(e.target.value as FinanceiroEstado)}
            >
              {ESTADOS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Candidatura</label>
          <select
            className={inputClass}
            value={candidaturaId}
            onChange={e => setCandidaturaId(e.target.value)}
          >
            <option value="">— sem candidatura —</option>
            {candidaturas.map(c => (
              <option key={c.id} value={c.id}>
                {c.id.slice(0, 8)} · {c.fase}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Parceiro {tipo === 'comissao' ? '(pré-preenche %)' : ''}</label>
          <select
            className={inputClass}
            value={parceiroId}
            onChange={e => aoEscolherParceiro(e.target.value)}
          >
            <option value="">— sem parceiro —</option>
            {parceiros.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Valor *</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
            />
            <FieldError message={errors.valor} />
          </div>
          <div>
            <label className={labelClass}>Moeda *</label>
            <input
              className={inputClass}
              value={moeda}
              maxLength={3}
              onChange={e => setMoeda(e.target.value.toUpperCase())}
              placeholder="EUR"
            />
            <FieldError message={errors.currency} />
          </div>
          {tipo === 'comissao' && (
            <div>
              <label className={labelClass}>% Comissão</label>
              <input
                className={inputClass}
                type="number"
                step="0.01"
                value={percentagem}
                onChange={e => setPercentagem(e.target.value)}
              />
              <FieldError message={errors.percentagem} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Taxa de câmbio → AOA (do dia)</label>
            <input
              className={inputClass}
              type="number"
              step="0.0001"
              value={taxa}
              onChange={e => setTaxa(e.target.value)}
              placeholder="ex.: 950.0000"
            />
            <p className="mt-1 text-[11px] text-gray-400">Taxa manual — nunca buscada automaticamente.</p>
          </div>
          <div>
            <label className={labelClass}>Contravalor AOA (ajustável)</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={contravalorMostrado}
              onChange={e => {
                setContravalorTocado(true)
                setContravalor(e.target.value)
              }}
              placeholder="valor × taxa"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              {contravalorTocado
                ? 'Ajustado manualmente.'
                : contravalorSugerido != null
                  ? 'Pré-calculado (valor × taxa). Podes ajustar.'
                  : 'Preenche valor e taxa para pré-calcular.'}
            </p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Notas</label>
          <textarea
            className={inputClass}
            rows={2}
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
