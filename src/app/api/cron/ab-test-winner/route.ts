import { NextRequest } from 'next/server'
import { handleCronRoute } from '@/lib/cron-route'

export async function GET(req: NextRequest) {
  return handleCronRoute(req, 'ab-test-winner')
}

export async function POST(req: NextRequest) {
  return handleCronRoute(req, 'ab-test-winner')
}
