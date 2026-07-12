import { NextResponse } from 'next/server'

// Health-check publico (story 1.1 AC5). Devolve 200 sempre que o processo Next
// esta vivo — usado pela Vercel e por smoke tests de go-live. Nao toca na BD para
// nao falhar por indisponibilidade transitoria do Supabase.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'sic-global-minds',
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  )
}
