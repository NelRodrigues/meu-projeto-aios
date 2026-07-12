#!/usr/bin/env node
/**
 * Security Audit — quick check (pre-deploy).
 * Corre só as checagens CRÍTICAS em Node puro. Sem dependências externas,
 * sem precisar do Claude Code. Exit 0 = autorizado, Exit 1 = bloqueado.
 *
 * Gerado pela skill PAIN — Security Audit. Audit completo: pede
 * "audita a segurança deste app" no Claude Code.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const findings = []

function grep(pattern, path, flags = 'rniE') {
  try {
    return execSync(
      `grep -${flags} ${JSON.stringify(pattern)} ${path} --include=*.ts --include=*.tsx --include=*.js --include=*.jsx`,
      { stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim()
  } catch {
    return '' // grep sai 1 quando não encontra = OK
  }
}

// ── Check 1: service_role fora de rotas de servidor ──────────────
// Em Next.js, service_role é legítimo em src/app/api/** e src/lib server-side.
// É CRÍTICO se aparecer em componentes de cliente ('use client') ou com prefixo público.
{
  const hits = grep('NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE|NEXT_PUBLIC_[A-Z_]*SECRET', 'src/')
  if (hits) findings.push({ rule: 'service_role_public_prefix', evidence: hits.split('\n')[0] })
}

// ── Check 2: chaves de provedores pagos hardcoded em src/ ────────
{
  const hits = grep(
    'sk-[a-zA-Z0-9_-]{20,}|sk-ant-api03-[a-zA-Z0-9_-]{40,}|AIza[0-9A-Za-z_-]{35}|sk_live_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}',
    'src/', 'rnoE'
  )
  if (hits) findings.push({ rule: 'hardcoded_api_key', evidence: hits.split('\n')[0] })
}

// ── Check 3: rotas de API com service_role SEM validação de auth ──
{
  const apiDir = 'src/app/api'
  if (existsSync(apiDir)) {
    const routes = execSync(`find ${apiDir} -name route.ts`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim().split('\n').filter(Boolean)
    for (const route of routes) {
      const src = readFileSync(route, 'utf8')
      const usesServiceRole = /SERVICE_ROLE_KEY|service_role/.test(src)
      const hasAuth = /requireTenantAuth|requireAdmin|getUser|getSession|verify.*signature|constructEvent|webhook_token|x-.*-signature/i.test(src)
      const isWebhook = /webhook|callback|notification/i.test(route)
      if (usesServiceRole && !hasAuth && !isWebhook) {
        findings.push({ rule: 'privileged_route_no_auth', evidence: route })
      }
    }
  }
}

// ── Check 4: .env real commitado no histórico git ────────────────
{
  try {
    const committed = execSync(
      "git log --all --diff-filter=A --name-only --pretty=format: 2>/dev/null | grep -E '^\\.env' | grep -v '.env.example' | sort -u",
      { stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim()
    if (committed) findings.push({ rule: 'env_committed', evidence: committed.split('\n')[0] })
  } catch { /* nada commitado = OK */ }
}

// ── Check 5: .env dentro de public/ ──────────────────────────────
{
  if (existsSync('public')) {
    try {
      const leaked = execSync(`find public -name '.env*' -not -name '.env.example'`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString().trim()
      if (leaked) findings.push({ rule: 'env_in_public', evidence: leaked.split('\n')[0] })
    } catch { /* OK */ }
  }
}

// ── Resultado ────────────────────────────────────────────────────
console.log('🔒 Security Audit (pre-deploy)')
if (findings.length > 0) {
  console.error(`❌ DEPLOY BLOQUEADO — ${findings.length} problema(s) crítico(s):\n`)
  for (const f of findings) console.error(`  🚨 ${f.rule} → ${f.evidence}`)
  console.error('\n🔧 Corrige: no Claude Code, pede "audita a segurança deste app".')
  console.error('⚠️  Forçar mesmo assim (NÃO recomendado): git push --no-verify\n')
  process.exit(1)
}
console.log('✅ 0 críticos. Deploy autorizado.')
process.exit(0)
