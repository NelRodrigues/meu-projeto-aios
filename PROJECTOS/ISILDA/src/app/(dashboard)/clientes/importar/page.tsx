'use client'

import Link from 'next/link'
import { ArrowLeft, FileDown } from 'lucide-react'
import { CsvImporter } from '@/components/clientes/csv-importer'
import { useRouter } from 'next/navigation'

export default function ImportarClientesPage() {
  const router = useRouter()

  function handleConcluido(importados: number) {
    if (importados > 0) {
      setTimeout(() => router.push('/clientes'), 2000)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/clientes"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Importar Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Importa clientes a partir de um ficheiro CSV</p>
        </div>
      </div>

      {/* Instrucoes */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-rose-800 mb-2 flex items-center gap-2">
          <FileDown className="h-4 w-4" />
          Formato do CSV
        </h3>
        <p className="text-xs text-rose-700 mb-2">O ficheiro CSV deve ter as seguintes colunas (separadas por virgula):</p>
        <code className="block text-xs bg-white border border-rose-200 rounded px-3 py-2 text-rose-600">
          nome, telefone, email (opcional), notas (opcional)
        </code>
        <p className="text-xs text-rose-600 mt-2">
          Exemplo: Maria Silva, 244923456789, maria@email.com, Cliente VIP
        </p>
        <ul className="text-xs text-rose-600 mt-2 space-y-1 list-disc list-inside">
          <li>Telefones duplicados sao ignorados automaticamente</li>
          <li>Header opcional (linha com &ldquo;nome, telefone&rdquo; e ignorada)</li>
          <li>Todos os clientes importados ficam com estagio &ldquo;novo&rdquo;</li>
        </ul>
      </div>

      {/* Importador */}
      <CsvImporter onConcluido={handleConcluido} />
    </div>
  )
}
