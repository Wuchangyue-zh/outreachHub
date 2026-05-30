import { NextRequest, NextResponse } from 'next/server'
import { handleCronRoute } from '@/lib/cron-route'

export async function GET(req: NextRequest) {
  return handleCronRoute(req, 'process-follow-ups')
}

export async function POST(req: NextRequest) {
  return handleCronRoute(req, 'process-follow-ups')
}
