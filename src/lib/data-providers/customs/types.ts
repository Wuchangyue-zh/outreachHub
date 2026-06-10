/**
 * N2a: 海关数据 Provider 统一类型定义
 * CustomsProvider 与 contact-oriented DataProvider 是独立的接口体系
 */

/** 海关搜索输入 */
export interface CustomsSearchInput {
  hsCode?: string
  country?: string
  keyword?: string
  dateFrom?: string   // ISO date
  dateTo?: string     // ISO date
  page?: number
  perPage?: number
}

/** 单条装运记录 */
export interface CustomsShipmentRecord {
  importerName: string
  importerCountry?: string
  importerCountryCode?: string
  exporterName: string
  exporterCountry?: string
  exporterCountryCode?: string
  hsCode?: string
  hsDescription?: string
  productDescription?: string
  shipmentDate?: string
  quantity?: number
  unitOfMeasure?: string
  amountUsd?: number
  currency?: string
  originPort?: string
  destinationPort?: string
  source?: string
  sourceId?: string
  raw?: Record<string, unknown>
}

/** 供应商摘要 */
export interface SupplierSummary {
  name: string
  country?: string
  countryCode?: string
  shipmentCount: number
  totalAmountUsd: number
  lastShipmentDate?: string
}

/** HS 编码摘要 */
export interface HsCodeSummary {
  code: string
  description?: string
  count: number
  totalAmountUsd: number
}

/** 搜索返回的买家概要 */
export interface CustomsBuyerResult {
  id: string                    // provider 或 DB ID
  companyName: string
  domain?: string
  country?: string
  countryCode?: string
  totalShipments: number
  totalAmountUsd: number
  lastShipmentDate?: string
  supplierCount: number
  topSuppliers: SupplierSummary[]
  topHsCodes: HsCodeSummary[]
  purchaseIntentScore?: number  // 来自 DB 缓存或实时计算
  importedAsContact?: boolean
}

/** 买家详情（含装运历史） */
export interface CustomsBuyerDetail extends CustomsBuyerResult {
  firstShipmentDate?: string
  avgShipmentAmount?: number
  shipments: CustomsShipmentRecord[]
  scoreBreakdown?: {
    frequency: number
    trend: number
    diversification: number
    recency: number
  }
  aiSummary?: string
}

/** 海关数据 Provider 接口 */
export interface CustomsProvider {
  name: string
  isConfigured(): boolean
  searchBuyers(input: CustomsSearchInput): Promise<CustomsBuyerResult[]>
  getBuyerDetail(buyerId: string): Promise<CustomsBuyerDetail | null>
}
