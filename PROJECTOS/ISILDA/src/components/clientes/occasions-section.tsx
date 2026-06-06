'use client'

import { useState, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react'
import { Plus, Trash2, Calendar, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { OccasionForm } from './occasion-form'

const TIPO_LABELS: Record<string, string> = {
  aniversario_proprio: 'Aniversário próprio',
  aniversario_filho: 'Aniversário de filho(a)',
  aniversario_familiar: 'Aniversário familiar',
  casamento: 'Casamento',
  batizado: 'Batizado',
  formatura: 'Formatura',
  natal: 'Natal',
  outro: 'Outro evento',
}

const MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface Ocasiao {
  id: string
  tipo: string
  nome_pessoa: string | null
  data_evento: string
  ano_especifico: number | null
  notas: string | null
  ultimo_lembrete_enviado: string | null
  activo: boolean
}

function formatDataEvento(dataEvento: string): string {
  const [mes, dia] = dataEvento.split('-')
  const mesNum = parseInt(mes) - 1
  return `${parseInt(dia)} ${MESES_SHORT[mesNum] ?? mes}`
}

function diasAteEvento(dataEvento: string): number {
  const [mes, dia] = dataEvento.split('-')
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const evento = new Date(ano, parseInt(mes) - 1, parseInt(dia))
  if (evento < hoje) evento.setFullYear(ano + 1)
  return Math.ceil((evento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

interface OccasionsSectionProps {
  clienteId: string
  compact?: boolean
}

// Handle imperativo: permite a componentes pai (ex. sidebar do inbox) abrir
// o formulario de ocasiao reutilizando esta seccao, sem duplicar logica.
export interface OccasionsSectionHandle {
  abrirForm: () => void
}

export const OccasionsSection = forwardRef<OccasionsSectionHandle, OccasionsSectionProps>(function OccasionsSection(
  { clienteId, compact = false },
  ref
) {
  const [ocasioes, setOcasioes] = useState<Ocasiao[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  // Instante de referencia estavel — evita chamar Date.now() (impuro) durante o render.
  const [agora] = useState(() => Date.now())
  const supabase = useMemo(() => createClient(), [])

  useImperativeHandle(ref, () => ({ abrirForm: () => setShowForm(true) }), [])

  const fetchOcasioes = useCallback(async () => {
    const { data } = await supabase
      .from('ocasioes_cliente')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('activo', true)
      .order('data_evento')
    if (data) setOcasioes(data as Ocasiao[])
    setLoading(false)
  }, [supabase, clienteId])

  useEffect(() => {
    let activo = true
    // setState corre dentro do .then (nunca no corpo sincrono do effect).
    supabase
      .from('ocasioes_cliente')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('activo', true)
      .order('data_evento')
      .then(({ data }) => {
        if (!activo) return
        if (data) setOcasioes(data as Ocasiao[])
        setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [supabase, clienteId])

  const handleSave = async (data: Partial<Ocasiao>) => {
    const { error } = await supabase.from('ocasioes_cliente').insert({
      ...data,
      cliente_id: clienteId,
    })
    if (error) throw error
    await fetchOcasioes()
  }

  const handleRemover = async (id: string) => {
    await supabase.from('ocasioes_cliente').update({ activo: false }).eq('id', id)
    setOcasioes((prev) => prev.filter((o) => o.id !== id))
  }

  if (loading) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Ocasiões</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {ocasioes.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhuma ocasião registada</p>
      ) : (
        <div className="space-y-2">
          {ocasioes.slice(0, compact ? 3 : undefined).map((o) => {
            const dias = diasAteEvento(o.data_evento)
            const lembreteEnviado = o.ultimo_lembrete_enviado
              ? Math.floor((agora - new Date(o.ultimo_lembrete_enviado).getTime()) / (1000 * 60 * 60 * 24))
              : null

            return (
              <div key={o.id} className="group flex items-start justify-between rounded-xl bg-gray-50 p-2.5">
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {TIPO_LABELS[o.tipo]}
                      {o.nome_pessoa ? ` — ${o.nome_pessoa}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">{formatDataEvento(o.data_evento)}</p>
                    {dias <= 35 && dias > 0 && (
                      <p className={`text-xs font-medium ${dias <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                        Em {dias} dia{dias !== 1 ? 's' : ''}
                      </p>
                    )}
                    {lembreteEnviado !== null && lembreteEnviado < 30 && (
                      <div className="flex items-center gap-0.5 text-xs text-emerald-600">
                        <Bell className="h-3 w-3" />
                        <span>Lembrete há {lembreteEnviado}d</span>
                      </div>
                    )}
                  </div>
                </div>
                {!compact && (
                  <button
                    onClick={() => handleRemover(o.id)}
                    className="shrink-0 p-1 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <OccasionForm
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
})
