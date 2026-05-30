/**
 * D3: 将历史 contactId='system-reply' 的 EmailLog 更新为真实 contactId
 *
 * 运行方式：npx tsx scripts/backfill-system-reply.ts
 *
 * 逻辑：
 * 1. 查找所有 contactId='system-reply' 且 status='SENT' 的 EmailLog
 * 2. 通过 toEmail 匹配 ContactEmail 表找到真实 contactId
 * 3. 更新 EmailLog.contactId
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== system-reply backfill 开始 ===\n')

  // 1. 查找所有 system-reply 的 EmailLog
  const orphanLogs = await prisma.emailLog.findMany({
    where: {
      contactId: 'system-reply',
    },
    select: {
      id: true,
      toEmail: true,
      campaignId: true,
      sentAt: true,
    },
  })

  console.log(`找到 ${orphanLogs.length} 条 contactId='system-reply' 的记录`)

  if (orphanLogs.length === 0) {
    console.log('无需处理')
    return
  }

  // 2. 收集所有 toEmail，批量查找对应的 contactId
  const emails = [...new Set(orphanLogs.map((l) => l.toEmail.toLowerCase()))]

  const contactEmails = await prisma.contactEmail.findMany({
    where: {
      address: { in: emails, mode: 'insensitive' },
    },
    select: {
      address: true,
      contactId: true,
    },
  })

  // 构建 email → contactId 映射
  const emailToContactId = new Map<string, string>()
  for (const ce of contactEmails) {
    const key = ce.address.toLowerCase()
    if (!emailToContactId.has(key)) {
      emailToContactId.set(key, ce.contactId)
    }
  }

  console.log(`匹配到 ${emailToContactId.size} 个邮箱 → 联系人映射`)

  // 3. 逐条更新
  let updated = 0
  let skipped = 0

  for (const log of orphanLogs) {
    const contactId = emailToContactId.get(log.toEmail.toLowerCase())
    if (!contactId) {
      skipped++
      continue
    }

    await prisma.emailLog.update({
      where: { id: log.id },
      data: { contactId },
    })
    updated++
  }

  console.log(`\n更新: ${updated} 条`)
  console.log(`跳过（未匹配）: ${skipped} 条`)
  console.log('\n=== backfill 完成 ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
