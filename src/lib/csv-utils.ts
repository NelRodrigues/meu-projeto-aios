// Utilitarios para importacao e exportacao de CSV

export interface CsvCliente {
  nome: string
  telefone: string
  email?: string
  notas?: string
}

export interface CsvImportResult {
  importados: number
  duplicados: number
  erros: { linha: number; mensagem: string }[]
  clientes: CsvCliente[]
}

export function parseCsv(content: string): { data: CsvCliente[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { data: [], errors: ['Ficheiro vazio'] }

  const errors: string[] = []
  const data: CsvCliente[] = []

  // Detectar e ignorar header
  const firstLine = lines[0].toLowerCase()
  const startIndex = firstLine.includes('nome') || firstLine.includes('name') ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'))

    if (cols.length < 2) {
      errors.push(`Linha ${i + 1}: formato invalido (minimo: nome, telefone)`)
      continue
    }

    const nome = cols[0]
    const telefone = cols[1]

    if (!nome) {
      errors.push(`Linha ${i + 1}: nome em falta`)
      continue
    }

    if (!telefone) {
      errors.push(`Linha ${i + 1}: telefone em falta`)
      continue
    }

    data.push({
      nome,
      telefone,
      email: cols[2] || undefined,
      notas: cols[3] || undefined,
    })
  }

  return { data, errors }
}

export function exportClientesCsv(clientes: {
  nome: string
  telefone: string | null
  email?: string | null
  estagio: string
  total_gasto: number
  total_pedidos: number
  ultima_compra: string | null
}[]): string {
  const header = 'Nome,Telefone,Email,Estagio,Total Gasto (Kz),Total Pedidos,Ultima Compra'
  const rows = clientes.map(c => [
    `"${c.nome}"`,
    c.telefone || '',
    c.email || '',
    c.estagio,
    c.total_gasto || 0,
    c.total_pedidos || 0,
    c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('pt-AO') : '',
  ].join(','))

  return [header, ...rows].join('\n')
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
