import { SettingsPanel } from '@/components/configuracoes/settings-panel'

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-brand-800">Configurações</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Área reservada para a gestão interna do sistema. As chaves de API ficam isoladas no separador próprio para não expor integrações externas na navegação normal.
        </p>
      </div>

      <SettingsPanel />
    </div>
  )
}
