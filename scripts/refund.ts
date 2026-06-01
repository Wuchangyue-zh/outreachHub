/**
 * 内部退款脚本（Batch R3a）
 * 用法: npx ts-node scripts/refund.ts <payment_intent_id> [amount_in_cents]
 *
 * 需要 STRIPE_SECRET_KEY 环境变量
 */

import Stripe from 'stripe'

async function main() {
  const paymentIntentId = process.argv[2]
  const amountStr = process.argv[3]

  if (!paymentIntentId) {
    console.error('用法: npx ts-node scripts/refund.ts <payment_intent_id> [amount_in_cents]')
    process.exit(1)
  }

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.error('错误: 未设置 STRIPE_SECRET_KEY 环境变量')
    process.exit(1)
  }

  const stripe = new Stripe(key, { apiVersion: '2026-05-27.dahlia' })

  try {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    }
    if (amountStr) {
      refundData.amount = parseInt(amountStr, 10)
    }

    const refund = await stripe.refunds.create(refundData)
    console.log('退款成功:', {
      id: refund.id,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('退款失败:', message)
    process.exit(1)
  }
}

main()
