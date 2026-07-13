// Teste de fumo de permissões — story 1.2 AC6.
// Cenários:
//   (a) anónimo NÃO lê tabelas de negócio (RLS exige `authenticated`)  ← corre já
//   (b) `operacao` NÃO faz DELETE em `leads`                            ← gate: utilizador real
//   (c) rota admin com sessão `operacao` → 403                          ← gate: utilizador real
//
// Correr: node --test tests/permissions-smoke.test.mjs
// Requer NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente
// (ou .env.local carregado). Os cenários (b)/(c) ficam `skip` até existirem
// utilizadores reais na equipa (criação = gate humano — ver story 1.2).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── Carregar credenciais do .env.local (sem dependências externas) ──────────
function loadEnv() {
  const env = { ...process.env }
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !env[m[1]]) env[m[1]] = m[2]
    }
  } catch {
    // sem .env.local — usa só process.env
  }
  return env
}

const env = loadEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const TABELAS_NEGOCIO = [
  'leads',
  'interacoes',
  'mensagens_whatsapp',
  'mudancas_estagio',
  'integration_keys',
  'team_members',
]

// ── (a) Anónimo não vê linhas de negócio (RLS activa) ───────────────────────
test('(a) cliente anónimo não lê linhas de tabelas de negócio', async (t) => {
  if (!URL || !ANON) {
    t.skip('NEXT_PUBLIC_SUPABASE_URL/ANON_KEY em falta')
    return
  }
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })

  for (const tabela of TABELAS_NEGOCIO) {
    const { data, error } = await anon.from(tabela).select('*').limit(5)
    // RLS sem policy para `anon` → devolve 0 linhas (não erro). Nunca deve
    // devolver linhas a um cliente não autenticado.
    assert.ok(
      !error || error.code === 'PGRST116' || error.code === '42501',
      `${tabela}: erro inesperado ${error?.code} ${error?.message}`,
    )
    assert.equal(
      (data ?? []).length,
      0,
      `${tabela}: anónimo NÃO devia ver linhas (viu ${(data ?? []).length})`,
    )
  }
})

// ── (b) `operacao` não faz DELETE em `leads` ────────────────────────────────
test('(b) sessão operacao não consegue DELETE em leads', { skip: 'requer utilizador operacao real — gate humano (criação de utilizadores, story 1.2)' }, async () => {
  // Passos quando o gate humano estiver resolvido:
  //   1. signInWithPassword como utilizador `operacao`
  //   2. .from('leads').delete().eq('id', <um id>)
  //   3. assert: 0 linhas afectadas (policy leads_delete exige is_admin)
})

// ── (c) Rota admin com sessão operacao → 403 ────────────────────────────────
test('(c) rota admin (/api/equipa) com sessão operacao devolve 403', { skip: 'requer utilizador operacao real + servidor a correr — gate humano' }, async () => {
  // Passos quando o gate humano estiver resolvido:
  //   1. obter access_token de um utilizador `operacao`
  //   2. fetch(`${SITE_URL}/api/equipa`, { headers: { Authorization: `Bearer ${token}` }})
  //   3. assert: resposta.status === 403 (requireAdmin rejeita não-admin)
})
