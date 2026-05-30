import { NextRequest } from 'next/server'
import { handleCronRoute } from '@/lib/cron-route'

export async function GET(req: NextRequest) {
  return handleCronRoute(req, 'advance-sequences')
}

export async function POST(req: NextRequest) {
  return handleCronRoute(req, 'advance-sequences')
}
