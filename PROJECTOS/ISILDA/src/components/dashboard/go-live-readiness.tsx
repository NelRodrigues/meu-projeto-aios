'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type GoLiveCheckStatus = 'ok' | 'warn' | 'manual'

interface GoLiveCheck {
  key: string
  label: string
  status: GoLiveCheckStatus
  detail: string
}

interface GoLiveReadinessReport {
  generated_at: string
  auto_ready: boolean
  auto_ok: number
  auto_warn: number
  manual_pending: number
  checks: GoLiveCheck[]
}

function statusStyles(status: GoLiveCheckStatus) {
  if (status === 'ok') return 'border-emerald-100 bg-emerald-50 text-emerald-700'
  if (status === 'warn') return 'border-amber-100 bg-amber-50 text-amber-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function statusIcon(status: GoLiveCheckStatus) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4" />
  if (status === 'warn') return <AlertTriangle className="h-4 w-4" />
  return <CircleDashed className="h-4 w-4" />
}

export function GoLiveReadiness() {
  const [report, setReport] = useState<GoLiveReadinessReport | null>(null)

  useEffect(() => {
    let activo = true
    async function load() {
      try {
        const res = await fetch('/api/diagnostics/go-live')
        if (!res.ok) return
        const data = (await res.json()) as GoLiveReadinessReport
        if (activo) setReport(data)
      } catch {
        if (activo) setReport(null)
      }
    }

    void load()
    return () => {
      activo = false
    }
  }, [])

  if (!report) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
          <CircleDashed className="h-4 w-4 animate-spin" />
          A validar prontidão de go-live
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Prontidão de go-live</h2>
          <p className="mt-1 text-xs text-gray-500">
            {report.auto_ready
              ? 'A parte automática está pronta. Ficam confirmações externas.'
              : 'Ainda há verificações automáticas por fechar.'}
          </p>
        </div>
        <Link href="/api/diagnostics/go-live" className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700">
          Ver JSON
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-emerald-600">Auto ok</p>
          <p className="mt-1 text-lg font-semibold text-emerald-700">{report.auto_ok}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-amber-600">Auto warn</p>
          <p className="mt-1 text-lg font-semibold text-amber-700">{report.auto_warn}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Manuais</p>
          <p className="mt-1 text-lg font-semibold text-slate-700">{report.manual_pending}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {report.checks.map((check) => (
          <div key={check.key} className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm ${statusStyles(check.status)}`}>
            <div className="mt-0.5 shrink-0">{statusIcon(check.status)}</div>
            <div className="min-w-0">
              <p className="font-medium">{check.label}</p>
              <p className="text-xs opacity-80">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Actualizado em {new Date(report.generated_at).toLocaleString('pt-AO')}
      </p>
    </div>
  )
}
