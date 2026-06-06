import { AgentConsole } from '@/components/ai-agent/agent-console'

export default function AiAgentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-800">Agente IA</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Consola operacional do motor IA. Aqui controlas o estado do agente, as ferramentas disponíveis e as protecções que vieram do SIC-MD.
        </p>
      </div>

      <AgentConsole />
    </div>
  )
}
