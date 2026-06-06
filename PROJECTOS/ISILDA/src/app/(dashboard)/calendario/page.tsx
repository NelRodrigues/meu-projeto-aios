import { MonthView } from '@/components/calendario/month-view'

export default function CalendarioPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Calendário de Produção</h1>
        <p className="mt-1 text-sm text-gray-500">Gerir disponibilidade e capacidade diária</p>
      </div>
      <MonthView />
    </div>
  )
}
