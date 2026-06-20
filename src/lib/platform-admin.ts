import { prisma } from '@/lib/prisma'

/**
 * Platform admin check — MUST query DB in real-time.
 * Never trust JWT alone (isPlatformAdmin is not in JWT payload).
 */
export async function requirePlatformAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPlatformAdmin: true },
  })
  return user?.isPlatformAdmin === true
}
