'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseCsv, type CsvCliente } from '@/lib/csv-utils'
import { createClient } from '@/lib/supabase/client'

interface CsvImporterProps {
  onConcluido?: (importados: number) => void
}

export function CsvImporter({ onConcluido }: CsvImporterProps) {
  const [parsed, setParsed] = useState<CsvCliente[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ importados: number; duplicados: number; erros: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      const { data, errors } = parseCsv(content)
      setParsed(data)
      setParseErrors(errors)
      setResult(null)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImportar() {
    if (parsed.length === 0) return
    setImporting(true)

    const supabase = createClient()
    let importados = 0
    let duplicados = 0
    let erros = 0

    for (const c of parsed) {
      // Verificar duplicado por telefone
      const { data: existing } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', c.telefone)
        .maybeSingle()

      if (existing) {
        duplicados++
        continue
      }

      const { error } = await supabase.from('clientes').insert({
        nome: c.nome,
        telefone: c.telefone,
        email: c.email || null,
        notas: c.notas || null,
        estagio: 'novo',
        origem: 'whatsapp',
      })

      if (error) {
        erros++
      } else {
        importados++
      }
    }

    setResult({ importados, duplicados, erros })
    setParsed([])
    setImporting(false)
    if (onConcluido) onConcluido(importados)
  }

  function handleReset() {
    setParsed([])
    setParseErrors([])
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (result) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
          <div>
            <h3 className="font-semibold text-gray-800">Importacao concluida</h3>
            <p className="text-sm text-gray-500">
              {result.importados} importados · {result.duplicados} duplicados ignorados · {result.erros} erros
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="w-full py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
        >
          Importar outro ficheiro
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          parsed.length > 0 ? 'border-rose-300 bg-rose-50' : 'border-gray-300 hover:border-rose-400 hover:bg-rose-50/30'
        )}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">Clica para seleccionar um ficheiro CSV</p>
        <p className="text-xs text-gray-400 mt-1">Formato: nome, telefone, email (opcional), notas (opcional)</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {/* Erros de parsing */}
      {parseErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">{parseErrors.length} erro(s) de formato</span>
          </div>
          <ul className="space-y-1">
            {parseErrors.slice(0, 5).map((e, i) => (
              <li key={i} className="text-xs text-red-600">{e}</li>
            ))}
            {parseErrors.length > 5 && (
              <li className="text-xs text-red-400">...e mais {parseErrors.length - 5} erros</li>
            )}
          </ul>
        </div>
      )}

      {/* Preview */}
      {parsed.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-medium text-gray-700">Preview — {parsed.length} cliente(s) a importar</span>
            <button onClick={handleReset} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Nome</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Telefone</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parsed.slice(0, 20).map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">{c.nome}</td>
                    <td className="px-3 py-2 text-gray-500">{c.telefone}</td>
                    <td className="px-3 py-2 text-gray-400">{c.email || '—'}</td>
                  </tr>
                ))}
                {parsed.length > 20 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-center text-gray-400">...e mais {parsed.length - 20} linhas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleImportar}
              disabled={importing}
              className="w-full py-2.5 text-sm font-medium bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? 'A importar...' : `Importar ${parsed.length} clientes`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
