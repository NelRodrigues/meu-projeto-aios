'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, CreditCard, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Pagamento {
  id: string
  valor: number
  metodo: string
  comprovativo_url: string | null
  created_at: string
  pedido_id: string
}

interface PaymentBannerProps {
  pagamentos: Pagamento[]
  clienteId: string
  onUpdate: () => void
}

export function PaymentBanner({ pagamentos, onUpdate }: PaymentBannerProps) {
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [rejeitando, setRejeitando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const supabase = createClient()

  if (pagamentos.length === 0) return null

  const handleConfirmar = async (pagamento: Pagamento) => {
    setConfirmando(pagamento.id)
    try {
      await supabase
        .from('pagamentos')
        .update({ estado: 'confirmado', confirmado_at: new Date().toISOString() })
        .eq('id', pagamento.id)

      await supabase
        .from('pedidos')
        .update({ estado: 'pago', pago_at: new Date().toISOString() })
        .eq('id', pagamento.pedido_id)

      onUpdate()
    } finally {
      setConfirmando(null)
    }
  }

  const handleRejeitar = async (pagamento: Pagamento) => {
    if (!motivo.trim()) return
    setRejeitando(pagamento.id)
    try {
      await supabase
        .from('pagamentos')
        .update({ estado: 'rejeitado', motivo_rejeicao: motivo })
        .eq('id', pagamento.id)
      setMotivo('')
      onUpdate()
    } finally {
      setRejeitando(null)
    }
  }

  return (
    <div className="border-b bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">
          {pagamentos.length} pagamento{pagamentos.length !== 1 ? 's' : ''} pendente{pagamentos.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {pagamentos.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="text-sm text-amber-700 font-medium">
              {p.valor.toLocaleString('pt-AO')} Kz
            </span>
            {p.comprovativo_url && (
              <a
                href={p.comprovativo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-3 w-3" />
                Ver comprovativo
              </a>
            )}
            <button
              onClick={() => handleConfirmar(p)}
              disabled={confirmando === p.id}
              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              <CheckCircle className="h-3 w-3" />
              Confirmar
            </button>
            <button
              onClick={() => {
                const m = prompt('Motivo de rejeição:')
                if (m) { setMotivo(m); handleRejeitar(p) }
              }}
              disabled={rejeitando === p.id}
              className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-200 disabled:opacity-50"
            >
              <XCircle className="h-3 w-3" />
              Rejeitar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
