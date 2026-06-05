'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  Clock3,
  Code2,
  Gauge,
  MessageSquareMore,
  Shield,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { detectJailbreakAttempt, sanitizeForContext, splitAgentMessage, stripInternalThinking } from '@/lib/ai-agent/safety'
import { isSharedBackendMode } from '@/lib/backend/config'

type AgentRow = {
  id: string
  name: string
  description: string | null
  system_prompt: string | null
  personality_traits: string[] | null
  target_stages: string[] | null
  settings: Record<string, unknown> | null
  model: string | null
  temperature: number | null
  max_tokens: number | null
  is_active: boolean | null
  created_at: string
  updated_at: string
}

type ToolRow = {
  id: string
  name: string
  description: string
  action_type: string
  priority: number | null
  is_active: boolean | null
  updated_at: string | null
}

type QueueRow = {
  id: string
  status: string
  scheduled_for: string
  attempts: number | null
  max_attempts: number | null
  message_content: string | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

type LogRow = {
  id: string
  log_type: string
  data: Record<string, unknown> | null
  tokens_input: number | null
  tokens_output: number | null
  created_at: string
}

type DashboardRow = {
  agent_id: string
  agent_name: string
  is_active: boolean
  total_conversations: number
  active_conversations: number
  paused_conversations: number
  total_messages_sent: number
  pending_in_queue: number
  failed_in_queue: number
}

type TabKey = 'painel' | 'configurar' | 'seguranca' | 'ferramentas' | 'fila'

const MODELOS_DISPONIVEIS = [
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (qualidade)' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (rápido/barato)' },
  { value: 'claude-opus-4-1', label: 'Claude Opus (máxima qualidade)' },
]

const TOOL_REFERENCE = [
  {
    name: 'verificar_disponibilidade',
    label: 'Verificar disponibilidade',
    description: 'Confirma se uma data pode receber encomendas.',
  },
  {
    name: 'criar_pedido',
    label: 'Criar pedido',
    description: 'Regista a encomenda quando o cliente confirma os detalhes.',
  },
  {
    name: 'registar_ocasiao',
    label: 'Registar ocasião',
    description: 'Guarda datas especiais para recompra e lembretes.',
  },
  {
    name: 'enviar_foto_portfolio',
    label: 'Enviar foto do portfólio',
    description: 'Partilha exemplos visuais relevantes com o cliente.',
  },
  {
    name: 'consultar_catalogo',
    label: 'Consultar catálogo',
    description: 'Lê os produtos e preços antes de responder.',
  },
]

const SAFETY_RULES = [
  {
    title: 'Strip internal thinking',
    description: 'Remove rascunho interno, respostas com "Resposta:" e texto de raciocínio antes do envio.',
    example: 'stripInternalThinking()',
  },
  {
    title: 'Jailbreak detection',
    description: 'Detecta pedidos para revelar prompts, regras ou instruções escondidas.',
    example: 'detectJailbreakAttempt()',
  },
  {
    title: 'Context sanitization',
    description: 'Limpa instruções injectadas antes de passar o histórico para a LLM.',
    example: 'sanitizeForContext()',
  },
  {
    title: 'Message pacing',
    description: 'Parte mensagens longas e mantém ritmo humano entre envios.',
    example: 'splitAgentMessage()',
  },
]

function safeDate(value: string | null | undefined) {
  if (!value) return 'n/a'
  return new Date(value).toLocaleString('pt-AO', {
    timeZone: 'Africa/Luanda',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function pillClass(active: boolean) {
  return active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
}

function statCard({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

export function AgentConsole() {
  const [mounted, setMounted] = useState(false)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
  const sharedMode = mounted ? isSharedBackendMode() : false
  const [activeTab, setActiveTab] = useState<TabKey>('painel')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [tools, setTools] = useState<ToolRow[]>([])
  const [queue, setQueue] = useState<QueueRow[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [dashboards, setDashboards] = useState<DashboardRow[]>([])

  // Estado do formulário de configuração do agente.
  const [cfg, setCfg] = useState({
    name: '',
    description: '',
    system_prompt: '',
    model: 'claude-sonnet-4-5',
    temperature: 0.7,
    max_tokens: 1024,
    traits: '',
    is_active: true,
  })
  const [cfgLoaded, setCfgLoaded] = useState(false)
  const [savingCfg, setSavingCfg] = useState(false)
  const [cfgMsg, setCfgMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true)
      setSupabase(createClient())
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    let active = true

    async function load() {
      const [agentsResult, toolsResult, queueResult, logsResult, dashboardResult] = await Promise.all([
        client
          .from('ai_sales_agents')
          .select('id,name,description,system_prompt,personality_traits,target_stages,settings,model,temperature,max_tokens,is_active,created_at,updated_at')
          .order('updated_at', { ascending: false }),
        client
          .from('ai_agent_tools')
          .select('id,name,description,action_type,priority,is_active,updated_at')
          .order('priority', { ascending: false, nullsFirst: false }),
        client
          .from('ai_agent_message_queue')
          .select('id,status,scheduled_for,attempts,max_attempts,message_content,error_message,created_at,processed_at')
          .order('created_at', { ascending: false })
          .limit(12),
        client
          .from('ai_agent_logs')
          .select('id,log_type,data,tokens_input,tokens_output,created_at')
          .order('created_at', { ascending: false })
          .limit(12),
        client
          .from('v_ai_agent_dashboard')
          .select('*')
          .order('total_conversations', { ascending: false }),
      ])

      if (!active) return

      const firstError =
        agentsResult.error?.message ||
        toolsResult.error?.message ||
        queueResult.error?.message ||
        logsResult.error?.message ||
        dashboardResult.error?.message ||
        null

      setError(firstError)
      setAgents((agentsResult.data ?? []) as AgentRow[])
      setTools((toolsResult.data ?? []) as ToolRow[])
      setQueue((queueResult.data ?? []) as QueueRow[])
      setLogs((logsResult.data ?? []) as LogRow[])
      setDashboards((dashboardResult.data ?? []) as DashboardRow[])
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [supabase])

  const activeAgent = agents.find((agent) => agent.is_active) ?? agents[0] ?? null

  // Preencher o formulário de config quando o agente activo é carregado.
  useEffect(() => {
    if (activeAgent && !cfgLoaded) {
      setCfg({
        name: activeAgent.name || '',
        description: activeAgent.description || '',
        system_prompt: activeAgent.system_prompt || '',
        model: activeAgent.model || 'claude-sonnet-4-5',
        temperature: typeof activeAgent.temperature === 'number' ? activeAgent.temperature : 0.7,
        max_tokens: activeAgent.max_tokens || 1024,
        traits: Array.isArray(activeAgent.personality_traits) ? activeAgent.personality_traits.join(', ') : '',
        is_active: activeAgent.is_active !== false,
      })
      setCfgLoaded(true)
    }
  }, [activeAgent, cfgLoaded])

  async function handleSaveConfig() {
    if (!activeAgent || !supabase) return
    if (!cfg.system_prompt.trim()) {
      setCfgMsg({ tipo: 'erro', texto: 'O prompt do sistema não pode ficar vazio.' })
      return
    }
    setSavingCfg(true)
    setCfgMsg(null)
    const traitsArray = cfg.traits.split(',').map((t) => t.trim()).filter(Boolean)
    const { data, error } = await supabase
      .from('ai_sales_agents')
      .update({
        name: cfg.name.trim(),
        description: cfg.description.trim() || null,
        system_prompt: cfg.system_prompt.trim(),
        model: cfg.model,
        temperature: cfg.temperature,
        max_tokens: cfg.max_tokens,
        personality_traits: traitsArray,
        is_active: cfg.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeAgent.id)
      .select('id,name,description,system_prompt,personality_traits,target_stages,settings,model,temperature,max_tokens,is_active,created_at,updated_at')
      .single()
    setSavingCfg(false)
    if (error) {
      setCfgMsg({ tipo: 'erro', texto: `Falha ao guardar: ${error.message}` })
      return
    }
    if (data) {
      setAgents((prev) => prev.map((a) => (a.id === data.id ? (data as AgentRow) : a)))
      setCfgMsg({ tipo: 'ok', texto: 'Configuração do agente guardada com sucesso.' })
    }
  }

  const activeTools = tools.filter((tool) => tool.is_active !== false)
  const queuePending = queue.filter((item) => item.status === 'pending').length
  const queueFailed = queue.filter((item) => item.status === 'failed').length
  const recentMessage = queue[0]?.message_content ?? logs[0]?.data?.message ?? null
  const sampleSafety = recentMessage ? stripInternalThinking(sanitizeForContext(String(recentMessage))) : ''
  const sampleJailbreakDetected = recentMessage ? detectJailbreakAttempt(String(recentMessage)) : false
  const sampleSplit = sampleSafety ? splitAgentMessage(sampleSafety, 120) : []

  if (!mounted || !supabase) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Centro do Agente IA</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  Consola de operação e segurança do agente. Aqui ficam o estado, as ferramentas e as protecções que vieram do motor do SIC-MD.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium', sharedMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                {sharedMode ? <ShieldAlert className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {sharedMode ? 'Modo partilhado activo' : 'Modo local/standalone activo'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                <Activity className="h-3.5 w-3.5" />
                {activeAgent ? activeAgent.name : 'Sem agente activo'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCard({ icon: Bot, label: 'Agentes', value: agents.length, hint: 'Configuração carregada' })}
            {statCard({ icon: Wrench, label: 'Ferramentas', value: activeTools.length, hint: 'Activas no agente' })}
            {statCard({ icon: MessageSquareMore, label: 'Fila pendente', value: queuePending, hint: 'Mensagens por processar' })}
            {statCard({ icon: AlertTriangle, label: 'Falhas', value: queueFailed, hint: 'Itens com erro' })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {([
          { key: 'painel', label: 'Painel', icon: Gauge },
          { key: 'configurar', label: 'Configurar', icon: Sparkles },
          { key: 'seguranca', label: 'Segurança', icon: Shield },
          { key: 'ferramentas', label: 'Ferramentas', icon: Wrench },
          { key: 'fila', label: 'Fila e Logs', icon: Clock3 },
        ] as const).map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                active ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          A carregar configuração do agente...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {!loading && activeTab === 'painel' && (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Agente activo</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {activeAgent?.name || 'Sem agente configurado'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {activeAgent?.description || 'Ainda não existe descrição para este agente.'}
                </p>
              </div>
              <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', pillClass(Boolean(activeAgent?.is_active)))}>
                {activeAgent?.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Modelo</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{activeAgent?.model || 'claude-sonnet-4-5'}</p>
                <p className="mt-1 text-xs text-slate-500">Temperatura {activeAgent?.temperature ?? 0.7} · max tokens {activeAgent?.max_tokens ?? 1024}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Regras-chave</p>
                <p className="mt-2 text-sm text-slate-700">
                  {activeAgent?.settings ? 'Working hours, debounce, pacing e limites activos.' : 'Sem settings carregados ainda.'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Conversas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboards[0]?.total_conversations ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">{dashboards[0]?.active_conversations ?? 0} activas · {dashboards[0]?.paused_conversations ?? 0} pausadas</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mensagens enviadas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboards[0]?.total_messages_sent ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">Volume acumulado do agente</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fila crítica</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboards[0]?.pending_in_queue ?? queuePending}</p>
                <p className="mt-1 text-xs text-slate-500">{dashboards[0]?.failed_in_queue ?? queueFailed} falhas registadas</p>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado rápido</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Prompt</p>
                <p className="mt-2 max-h-40 overflow-hidden text-sm text-slate-700">
                  {activeAgent?.system_prompt ? activeAgent.system_prompt : 'Sem prompt definido. O agente usa o fallback do motor.'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Traits</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(activeAgent?.personality_traits || ['calorosa', 'pragmática', 'proxima']).slice(0, 6).map((trait) => (
                    <span key={trait} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 border border-slate-200">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {!loading && activeTab === 'configurar' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!activeAgent ? (
            <p className="text-sm text-slate-500">Nenhum agente para configurar.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Configurar o agente</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Ajusta o comportamento da Soraya. As alterações gravam directamente no Supabase e entram em vigor na próxima mensagem.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingCfg}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-50"
                >
                  {savingCfg ? <Clock3 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Guardar configuração
                </button>
              </div>

              {cfgMsg && (
                <div className={cn(
                  'rounded-xl border px-4 py-2.5 text-sm',
                  cfgMsg.tipo === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
                )}>
                  {cfgMsg.texto}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nome do agente</label>
                  <input
                    value={cfg.name}
                    onChange={(e) => setCfg({ ...cfg, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</label>
                  <input
                    value={cfg.description}
                    onChange={(e) => setCfg({ ...cfg, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt do sistema (personalidade e regras)</label>
                  <span className="text-xs text-slate-400">{cfg.system_prompt.length} caracteres</span>
                </div>
                <textarea
                  value={cfg.system_prompt}
                  onChange={(e) => setCfg({ ...cfg, system_prompt: e.target.value })}
                  rows={16}
                  spellCheck={false}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-[13px] leading-relaxed focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  placeholder="Define quem é o agente, como fala, regras de negócio, preços, prazos..."
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Este é o cérebro da Soraya. Quanto mais claro e completo, melhor ela responde. Inclui regras de preços, prazos, tom de voz e o que nunca deve fazer.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Modelo</label>
                  <select
                    value={cfg.model}
                    onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    {MODELOS_DISPONIVEIS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Temperatura · {cfg.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={cfg.temperature}
                    onChange={(e) => setCfg({ ...cfg, temperature: Number(e.target.value) })}
                    className="w-full accent-rose-600"
                  />
                  <p className="mt-1 text-xs text-slate-400">Baixa = previsível · Alta = criativa</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Máx. tokens (resposta)</label>
                  <input
                    type="number"
                    min={256}
                    max={4096}
                    step={128}
                    value={cfg.max_tokens}
                    onChange={(e) => setCfg({ ...cfg, max_tokens: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Traços de personalidade (separados por vírgula)</label>
                <input
                  value={cfg.traits}
                  onChange={(e) => setCfg({ ...cfg, traits: e.target.value })}
                  placeholder="elegante, calorosa, clara, contextual, profissional"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                {cfg.traits.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cfg.traits.split(',').map((t) => t.trim()).filter(Boolean).map((t, i) => (
                      <span key={i} className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs text-rose-600">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={cfg.is_active}
                  onChange={(e) => setCfg({ ...cfg, is_active: e.target.checked })}
                  className="h-4 w-4 accent-rose-600"
                />
                <span className="text-sm text-slate-700">
                  <span className="font-medium">Agente activo</span> — quando desligado, a Soraya pára de responder automaticamente.
                </span>
              </label>
            </div>
          )}
        </section>
      )}

      {!loading && activeTab === 'seguranca' && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Protecções activas</h3>
                <p className="mt-1 text-sm text-slate-600">As rotinas abaixo vieram do agente mais maduro e já estão disponíveis no motor.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {SAFETY_RULES.map((rule) => (
                <div key={rule.title} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rule.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{rule.description}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      {rule.example}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Teste de segurança</h3>
                <p className="mt-1 text-sm text-slate-600">A consola faz uma amostra do texto recente para validar o comportamento antes do envio.</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detecção de jailbreak</p>
              <p className="mt-2 text-sm text-slate-700">{sampleJailbreakDetected ? 'Amostra marcada como tentativa suspeita.' : 'Nenhuma tentativa suspeita detectada na amostra recente.'}</p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resposta limpa</p>
              <p className="mt-2 text-sm text-slate-700">
                {sampleSafety ? sampleSafety : 'Sem amostra para limpar neste momento.'}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Split preview</p>
              <div className="mt-2 space-y-2">
                {sampleSplit.length > 0 ? sampleSplit.slice(0, 3).map((part, index) => (
                  <p key={`${index}-${part}`} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 border border-slate-200">
                    {part}
                  </p>
                )) : <p className="text-sm text-slate-500">A divisão de mensagens aparece aqui quando houver texto recente suficiente.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {!loading && activeTab === 'ferramentas' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Ferramentas activas</h3>
                <p className="mt-1 text-sm text-slate-600">O motor do SIC-MD trabalha melhor quando o agente tem ferramentas pequenas e directas.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {TOOL_REFERENCE.map((tool) => {
                const dbTool = tools.find((item) => item.name === tool.name)
                return (
                  <div key={tool.name} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{tool.label}</p>
                        <p className="mt-1 text-sm text-slate-600">{tool.description}</p>
                      </div>
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', pillClass(Boolean(dbTool?.is_active)))}>
                        {dbTool?.is_active ? 'Ligada' : 'Offline'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{dbTool?.action_type || 'action_type n/a'}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">prioridade {dbTool?.priority ?? 0}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Settings do agente</h3>
                <p className="mt-1 text-sm text-slate-600">Resumo do objecto `settings` carregado do backend.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                {
                  label: 'working_hours',
                  value: activeAgent?.settings
                    ? `${String(activeAgent.settings.working_hours_start || '08:00')} - ${String(activeAgent.settings.working_hours_end || '20:00')}`
                    : 'n/a',
                },
                {
                  label: 'working_days',
                  value: activeAgent?.settings?.working_days
                    ? String((activeAgent.settings.working_days as Array<unknown>).join(', '))
                    : 'n/a',
                },
                { label: 'debounce_seconds', value: activeAgent?.settings?.debounce_seconds ?? 'n/a' },
                { label: 'queue_batch_size', value: activeAgent?.settings?.queue_batch_size ?? 'n/a' },
                { label: 'context_messages_limit', value: activeAgent?.settings?.context_messages_limit ?? 'n/a' },
                { label: 'max_messages_per_conversation', value: activeAgent?.settings?.max_messages_per_conversation ?? 'n/a' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{String(item.value)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Prompt preview</p>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap break-words">
                {activeAgent?.system_prompt ? sanitizeForContext(activeAgent.system_prompt).slice(0, 450) : 'Sem prompt carregado.'}
              </p>
            </div>
          </section>
        </div>
      )}

      {!loading && activeTab === 'fila' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Fila recente</h3>
                <p className="mt-1 text-sm text-slate-600">Mensagens e estados do motor do agente.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {queue.length > 0 ? queue.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{item.status}</p>
                      <p className="mt-1 max-h-12 overflow-hidden text-sm text-slate-600">{item.message_content || 'Sem conteúdo visível'}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      {item.attempts ?? 0}/{item.max_attempts ?? 3}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{safeDate(item.scheduled_for)}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{safeDate(item.created_at)}</span>
                    {item.error_message && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">{item.error_message}</span>}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">A fila está vazia neste momento.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Logs recentes</h3>
                <p className="mt-1 text-sm text-slate-600">Registo do motor para observabilidade e debugging.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {logs.length > 0 ? logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{log.log_type}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      {safeDate(log.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 break-words">
                    {log.data ? JSON.stringify(log.data).slice(0, 260) : 'Sem payload'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">input {log.tokens_input ?? 0}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">output {log.tokens_output ?? 0}</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">Ainda não há logs recentes.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
