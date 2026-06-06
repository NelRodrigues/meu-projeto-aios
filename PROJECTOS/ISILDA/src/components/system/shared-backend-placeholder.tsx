import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { getBackendCompatibilityReport } from '@/lib/backend/config'

interface SharedBackendPlaceholderProps {
  area: string
  summary: string
}

export function SharedBackendPlaceholder({
  area,
  summary,
}: SharedBackendPlaceholderProps) {
  const report = getBackendCompatibilityReport()

  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-5 text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-2">
          <div>
            <h2 className="text-base font-semibold">{area} em migração para o backend partilhado</h2>
            <p className="mt-1 text-sm text-amber-900/90">{summary}</p>
          </div>

          <div className="text-sm text-amber-900/90">
            <p>Tenant activo: <strong>{report.sharedTenantSlug ?? 'nao definido'}</strong></p>
            {report.sharedTenantId ? <p>ID: {report.sharedTenantId}</p> : null}
          </div>

          {report.nextSteps.length > 0 && (
            <ul className="space-y-1 text-sm text-amber-900/90">
              {report.nextSteps.slice(0, 2).map((step) => (
                <li key={step}>- {step}</li>
              ))}
            </ul>
          )}

          <Link
            href="/api/diagnostics/backend"
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-950 underline underline-offset-4"
          >
            Ver diagnóstico do backend
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
