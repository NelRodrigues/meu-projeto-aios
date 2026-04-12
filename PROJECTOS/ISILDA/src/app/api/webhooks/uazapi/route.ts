import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[webhook-proxy] Missing env vars')
    return NextResponse.json({ status: 'ok' })
  }

  // Forward to Edge Function (fire-and-forget)
  fetch(`${supabaseUrl}/functions/v1/uazapi-webhook-receiver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  }).catch((err) => {
    console.error('[webhook-proxy] Forward error:', err.message)
  })

  return NextResponse.json({ status: 'ok' })
}
