import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')

function readText(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('proxy do Next 16 existe e middleware legado foi removido', () => {
  assert.equal(fs.existsSync(path.join(projectRoot, 'src/proxy.ts')), true)
  assert.equal(fs.existsSync(path.join(projectRoot, 'src/middleware.ts')), false)
})

test('manifest referencia apenas icones existentes', () => {
  const manifest = JSON.parse(readText('public/manifest.json'))

  for (const icon of manifest.icons) {
    const iconPath = icon.src.replace(/^\//, '')
    assert.equal(
      fs.existsSync(path.join(projectRoot, 'public', iconPath)),
      true,
      `Icone ausente no manifest: ${icon.src}`
    )
  }
})

test('rota manual de criacao de clientes existe', () => {
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, 'src/app/(dashboard)/clientes/novo/page.tsx')
    ),
    true
  )
})

test('diagnostico de backend existe para cutover multi-tenant', () => {
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, 'src/app/api/diagnostics/backend/route.ts')
    ),
    true
  )
})

test('proxy permite diagnostico publico durante a migracao', () => {
  const proxy = readText('src/proxy.ts')

  assert.match(proxy, /\/api\/diagnostics/)
})

test('service worker mantem assets criticos configurados', () => {
  const serviceWorker = readText('public/sw.js')

  assert.match(serviceWorker, /\/manifest\.json/)
  assert.match(serviceWorker, /cache-first/)
  assert.match(serviceWorker, /network-first/)
})

test('documentacao do cutover shared Supabase foi registada', () => {
  const doc = readText('docs/architecture/shared-supabase-isilda-cutover.md')

  assert.match(doc, /tenant_id/i)
  assert.match(doc, /backend partilhado/i)
  assert.match(doc, /clientes/i)
})

test('shared mappers existem para contactos e deals', () => {
  assert.equal(
    fs.existsSync(path.join(projectRoot, 'src/lib/backend/shared-mappers.ts')),
    true
  )
})

test('modulos principais nao voltaram a renderizar placeholders de migracao', () => {
  const files = [
    'src/app/(dashboard)/clientes/page.tsx',
    'src/app/(dashboard)/pedidos/page.tsx',
    'src/app/(dashboard)/catalogo/page.tsx',
    'src/app/(dashboard)/calendario/page.tsx',
    'src/app/(dashboard)/clientes/importar/page.tsx',
    'src/app/(dashboard)/pedidos/novo/page.tsx',
  ]

  for (const file of files) {
    const content = readText(file)
    assert.doesNotMatch(content, /SharedBackendPlaceholder/, file)
  }
})
