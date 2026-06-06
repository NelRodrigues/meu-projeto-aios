import { NextResponse } from 'next/server'
import { getBackendCompatibilityReport } from '@/lib/backend/config'

export async function GET() {
  return NextResponse.json(getBackendCompatibilityReport())
}
