'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { FileText, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { MessageTemplate } from '@/types/database'

// Labels amigaveis para as categorias de confeitaria.
const CATEGORIA_LABELS: Record<string, string> = {
  boas_vindas: 'Boas-vindas',
  orcamento: 'Orçamento',
  confirmacao_pedido: 'Confirmação de pedido',
  lembrete_entrega: 'Lembrete de entrega',
  pos_entrega: 'Pós-entrega',
  reactivacao: 'Reactivação',
}

// Ordem preferida das categorias no dropdown (as desconhecidas vao para o fim).
const CATEGORIA_ORDEM = [
  'boas_vindas',
  'orcamento',
  'confirmacao_pedido',
  'lembrete_entrega',
  'pos_entrega',
  'reactivacao',
]

function labelCategoria(categoria: string | null): string {
  if (!categoria) return 'Outros'
  return CATEGORIA_LABELS[categoria] ?? categoria.replace(/_/g, ' ')
}

interface TemplateSelectorProps {
  onSelect: (conteudo: string) => void
  disabled?: boolean
}

export function TemplateSelector({ onSelect, disabled = false }: TemplateSelectorProps) {
  const [aberto, setAberto] = useState(false)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  // Carrega os templates activos uma vez. Fallback gracioso: se a query
  // falhar (backend offline), fica com lista vazia sem rebentar a UI.
  useEffect(() => {
    let activo = true
    supabase
      .from('templates_whatsapp')
      .select('*')
      .eq('activo', true)
      .order('categoria')
      .then(({ data }) => {
        if (!activo) return
        if (data) setTemplates(data as MessageTemplate[])
        setLoading(false)
      })
    return () => {
      activo = false
    }
  }, [supabase])

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    if (!aberto) return
    const handleClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [aberto])

  // Agrupa por categoria respeitando a ordem preferida.
  const grupos = useMemo(() => {
    const mapa = new Map<string, MessageTemplate[]>()
    for (const t of templates) {
      const chave = t.categoria ?? 'outros'
      const lista = mapa.get(chave) ?? []
      lista.push(t)
      mapa.set(chave, lista)
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => {
      const ia = CATEGORIA_ORDEM.indexOf(a)
      const ib = CATEGORIA_ORDEM.indexOf(b)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
  }, [templates])

  const handleEscolher = (conteudo: string) => {
    onSelect(conteudo)
    setAberto(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        disabled={disabled}
        title="Templates rápidos"
        className={cn(
          'flex-shrink-0 p-2.5 rounded-xl transition-colors',
          disabled
            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
        )}
      >
        <FileText className="h-4 w-4" />
      </button>

      {aberto && !disabled && (
        <div className="absolute bottom-full left-0 mb-2 w-72 max-h-80 overflow-y-auto rounded-xl border border-rose-100 bg-white shadow-lg z-20">
          <div className="sticky top-0 border-b border-rose-100 bg-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Templates rápidos
            </p>
          </div>

          {loading ? (
            <p className="px-3 py-4 text-xs text-gray-400">A carregar...</p>
          ) : grupos.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-400">Nenhum template disponível</p>
          ) : (
            grupos.map(([categoria, lista]) => (
              <div key={categoria} className="py-1">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                  {labelCategoria(categoria)}
                </p>
                {lista.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleEscolher(t.conteudo)}
                    className="group flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-rose-50 transition-colors"
                  >
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-rose-400" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-gray-800">{t.nome}</span>
                      <span className="block truncate text-[11px] text-gray-400">{t.conteudo}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
