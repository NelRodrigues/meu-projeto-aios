'use client'

import { Star, Clock, Package } from 'lucide-react'
import type { Produto } from '@/types/database'

const CATEGORIA_LABELS: Record<string, string> = {
  chantilly: 'Chantilly',
  bento_cake: 'Bento Cake',
  especiais: 'Especiais',
  naked_vintage: 'Naked/Vintage',
  doces: 'Doces',
  casamento: 'Casamento',
  outro: 'Outro',
}

interface ProductCardProps {
  produto: Produto
  onEdit?: (produto: Produto) => void
  onToggleActivo?: (produto: Produto) => void
}

export function ProductCard({ produto, onEdit, onToggleActivo }: ProductCardProps) {
  const precoDisplay = produto.sob_consulta
    ? 'Sob consulta'
    : produto.preco_base && produto.preco_base > 0
    ? `${produto.preco_base.toLocaleString('pt-AO')} Kz`
    : null

  return (
    <div className={`group relative rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${!produto.activo ? 'opacity-60' : ''}`}>
      {/* Foto */}
      <div className="relative h-48 w-full overflow-hidden rounded-t-2xl bg-rose-50">
        {produto.foto_principal ? (
          // URL dinamica de Supabase Storage com dominio ainda nao configurado em next.config;
          // next/image exigiria remotePatterns que so saberemos no go-live. Mantemos <img>.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.foto_principal}
            alt={produto.nome}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-16 w-16 text-rose-200" />
          </div>
        )}
        {!produto.activo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600">Inactivo</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-rose-700">
            {CATEGORIA_LABELS[produto.categoria] ?? produto.categoria}
          </span>
        </div>
      </div>

      {/* Conteudo */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{produto.nome}</h3>
        {produto.descricao && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{produto.descricao}</p>
        )}

        {/* Meta */}
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          {/* Complexidade */}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < produto.complexidade ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
              />
            ))}
          </div>
          {/* Tempo de producao */}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{produto.tempo_producao_horas}h</span>
          </div>
        </div>

        {/* Preco */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            {precoDisplay ? (
              <span className={`font-semibold ${produto.sob_consulta ? 'text-sm text-gray-500' : 'text-rose-600'}`}>
                {produto.sob_consulta ? '' : 'A partir de '}
                {precoDisplay}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Preco não definido</span>
            )}
          </div>

          {/* Accoes */}
          {(onEdit || onToggleActivo) && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onEdit && (
                <button
                  onClick={() => onEdit(produto)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {onToggleActivo && (
                <button
                  onClick={() => onToggleActivo(produto)}
                  className={`rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 ${produto.activo ? 'hover:text-red-500' : 'hover:text-emerald-500'}`}
                  title={produto.activo ? 'Desactivar' : 'Activar'}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {produto.activo ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
