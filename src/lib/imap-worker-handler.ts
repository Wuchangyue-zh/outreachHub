import { checkRepliesFromAllAccounts } from './imap-multi'

export async function executeCheckReplies(userId?: string) {
  console.log('[IMAP] Starting check-replies job...')
  const result = await checkRepliesFromAllAccounts(userId)
  console.log(`[IMAP] check-replies completed: ${result.totalReplies} replies`)
  return result
}
