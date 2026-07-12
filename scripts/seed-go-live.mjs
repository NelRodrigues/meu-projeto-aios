import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return env
}

function parseSeedProducts(seedPath) {
  const sql = fs.readFileSync(seedPath, 'utf8')
  const lines = sql.split(/\r?\n/)
  const tuples = []
  let collecting = false
  let buffer = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!collecting && trimmed === '(') {
      collecting = true
      buffer = [line]
      continue
    }
    if (collecting) {
      buffer.push(line)
      if (trimmed.endsWith('),') || trimmed.endsWith(');')) {
        tuples.push(buffer.join('\n'))
        collecting = false
        buffer = []
      }
    }
  }

  return tuples.map((tuple) => {
    const rows = tuple
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean)

    if (rows.length < 8) {
      throw new Error(`Tuple do seed inesperada: ${tuple.slice(0, 200)}...`)
    }

    const nome = rows[1].replace(/^'|'[,]?$/g, '')
    const descricao = rows[2].replace(/^'|'[,]?$/g, '')
    const categoria = rows[3].replace(/^'|'[,]?$/g, '')
    const tagsMatch = rows[4].match(/^ARRAY\[(.*)\]$/)
    const tags = (tagsMatch?.[1] ?? '')
      .split(',')
      .map((tag) => tag.trim().replace(/^'/, '').replace(/'$/, ''))
      .filter(Boolean)
    const precoBase = Number(rows[5].replace(/,$/, ''))
    const precosRaw = rows[6]
      .replace(/,$/, '')
      .replace(/::jsonb$/i, '')
      .replace(/^'/, '')
      .replace(/'$/, '')
    const precosPorTamanho = JSON.parse(precosRaw)

    const tail = rows[7].replace(/^\(|\),?$/g, '')
    const tailParts = tail
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

    let sobConsulta = false
    let tempoIndex = 0
    if (tailParts.length === 4) {
      sobConsulta = tailParts[0] === 'true'
      tempoIndex = 1
    }

    const tempo = Number(tailParts[tempoIndex])
    const complexidade = Number(tailParts[tempoIndex + 1])
    const activo = tailParts[tempoIndex + 2] === 'true'

    return {
      nome,
      descricao,
      categoria,
      tags,
      preco_base: precoBase,
      precos_por_tamanho: precosPorTamanho,
      sob_consulta: sobConsulta,
      tempo_producao_horas: tempo,
      complexidade,
      activo,
    }
  })
}

async function main() {
  const root = process.cwd()
  const env = loadEnv(path.join(root, '.env.local'))
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const seedPath = path.join(root, 'supabase/migrations/024_seed_catalogo.sql')
  const products = parseSeedProducts(seedPath)

  const { data: existingRows } = await supabase
    .from('products')
    .select('id,nome,tenant_id')
    .eq('tenant_id', '81bc8777-39f3-477a-8ad6-44f9dcf1eca8')
  const existingNames = new Set((existingRows ?? []).map((row) => row.nome))
  const toInsert = products.filter((product) => !existingNames.has(product.nome))

  if (toInsert.length > 0) {
    const payload = toInsert.map((product) => ({
      tenant_id: '81bc8777-39f3-477a-8ad6-44f9dcf1eca8',
      nome: product.nome,
      descricao: product.descricao,
      valor: product.preco_base,
      formato: product.precos_por_tamanho && Object.keys(product.precos_por_tamanho).length > 0
        ? Object.keys(product.precos_por_tamanho)[0]
        : 'Padrão',
      duracao: `${product.tempo_producao_horas} horas`,
      capacidade_maxima: product.sob_consulta ? null : 30,
      nivel_funil: product.sob_consulta ? 'premium' : product.complexidade <= 2 ? 'entrada' : 'central',
      activo: product.activo,
    }))
    const { error } = await supabase.from('products').insert(payload)
    if (error) throw error
  }

  const bucketName = 'portfolio'
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!(buckets ?? []).some((bucket) => bucket.name === bucketName)) {
    const { error } = await supabase.storage.createBucket(bucketName, { public: true })
    if (error) throw error
  }

  const { count: totalProdutos } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', '81bc8777-39f3-477a-8ad6-44f9dcf1eca8')

  const { data: produtosComFoto } = await supabase
    .from('products')
    .select('id')
    .eq('tenant_id', '81bc8777-39f3-477a-8ad6-44f9dcf1eca8')

  console.log(
    JSON.stringify(
      {
        inserted: toInsert.length,
        totalProdutos: totalProdutos ?? 0,
        produtosComFoto: produtosComFoto?.length ?? 0,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
