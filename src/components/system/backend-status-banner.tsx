'use client'

import { AlertTriangle } from 'lucide-react'
import { getBackendCompatibilityReport } from '@/lib/backend/config'

export function BackendStatusBanner() {
  const report = getBackendCompatibilityReport()

  if (report.canUseCurrentRepoContract && report.warnings.length === 0) {
    return null
  }

  if (!report.isPlaceholderUrl) {
    return null
  }

  return (
    <div className="rounded-md border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Supabase ainda nao configurado neste ambiente.</p>
          <p className="mt-1 text-amber-800/90">
            As variaveis publicas continuam com placeholder, por isso este CRM nao vai carregar
            dados reais aqui.
          </p>
        </div>
      </div>
    </div>
  )
}
