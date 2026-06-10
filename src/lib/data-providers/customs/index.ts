/**
 * N2a: 海关数据 Provider 工厂
 * 有 CUSTOMS_API_KEY → ImportGenius；否则 → Mock（开发/Demo 用）
 */
import type { CustomsProvider } from './types'
import { ImportGeniusProvider } from './importgenius'
import { MockCustomsProvider } from './mock-provider'

export function getCustomsProvider(): CustomsProvider {
  const provider = process.env.CUSTOMS_PROVIDER || 'importgenius'

  if (provider === 'importgenius' && process.env.CUSTOMS_API_KEY) {
    return new ImportGeniusProvider()
  }

  return new MockCustomsProvider()
}

export type { CustomsProvider, CustomsSearchInput, CustomsBuyerResult, CustomsBuyerDetail } from './types'
