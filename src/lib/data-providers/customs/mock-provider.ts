/**
 * N2a: Mock 海关数据 Provider
 * 无 API Key 时返回逼真样本数据，支持本地开发与 Demo
 */
import type {
  CustomsProvider,
  CustomsSearchInput,
  CustomsBuyerResult,
  CustomsBuyerDetail,
  CustomsShipmentRecord,
  SupplierSummary,
  HsCodeSummary,
} from './types'

const MOCK_BUYERS: CustomsBuyerDetail[] = [
  {
    id: 'buyer-001',
    companyName: 'Home Depot International',
    domain: 'homedepot.com',
    country: 'United States',
    countryCode: 'US',
    totalShipments: 156,
    totalAmountUsd: 28_500_000,
    lastShipmentDate: '2026-05-15',
    firstShipmentDate: '2023-01-10',
    supplierCount: 8,
    avgShipmentAmount: 182_692,
    purchaseIntentScore: 92,
    topSuppliers: [
      { name: 'Shenzhen HuaTech Electronics', country: 'China', countryCode: 'CN', shipmentCount: 42, totalAmountUsd: 8_200_000, lastShipmentDate: '2026-05-15' },
      { name: 'Ningbo SmartHome Co.', country: 'China', countryCode: 'CN', shipmentCount: 35, totalAmountUsd: 6_100_000, lastShipmentDate: '2026-04-22' },
      { name: 'Guangzhou PowerTools Ltd.', country: 'China', countryCode: 'CN', shipmentCount: 28, totalAmountUsd: 5_000_000, lastShipmentDate: '2026-03-18' },
      { name: 'Dongguan LED Solutions', country: 'China', countryCode: 'CN', shipmentCount: 22, totalAmountUsd: 4_200_000, lastShipmentDate: '2026-05-02' },
      { name: 'Foshan Ceramics Group', country: 'China', countryCode: 'CN', shipmentCount: 18, totalAmountUsd: 3_000_000, lastShipmentDate: '2026-02-28' },
    ],
    topHsCodes: [
      { code: '8541.40', description: 'LED diodes and semiconductors', count: 48, totalAmountUsd: 9_500_000 },
      { code: '8471.30', description: 'Portable computers and laptops', count: 35, totalAmountUsd: 7_200_000 },
      { code: '9405.42', description: 'LED lighting fixtures', count: 28, totalAmountUsd: 5_800_000 },
      { code: '8467.21', description: 'Electric drills and power tools', count: 25, totalAmountUsd: 4_000_000 },
      { code: '6907.21', description: 'Ceramic floor tiles', count: 20, totalAmountUsd: 2_000_000 },
    ],
    shipments: generateShipments('Home Depot International', 'US', 'CN', 20),
    scoreBreakdown: { frequency: 95, trend: 88, diversification: 85, recency: 98 },
    aiSummary: '该买家近12个月采购频次高且金额持续增长，供应商从5家增至8家表明采购需求扩张，最近一笔装运仅16天前，综合评估为极高意向买家。',
  },
  {
    id: 'buyer-002',
    companyName: 'Amazon EU Sarl',
    domain: 'amazon.de',
    country: 'Germany',
    countryCode: 'DE',
    totalShipments: 234,
    totalAmountUsd: 45_000_000,
    lastShipmentDate: '2026-05-20',
    firstShipmentDate: '2022-06-01',
    supplierCount: 12,
    avgShipmentAmount: 192_307,
    purchaseIntentScore: 96,
    topSuppliers: [
      { name: 'Shenzhen JiaYuan Tech', country: 'China', countryCode: 'CN', shipmentCount: 55, totalAmountUsd: 12_000_000, lastShipmentDate: '2026-05-20' },
      { name: 'Hangzhou YunShang Ltd.', country: 'China', countryCode: 'CN', shipmentCount: 48, totalAmountUsd: 10_500_000, lastShipmentDate: '2026-05-10' },
      { name: 'Yiwu Commodity Trading', country: 'China', countryCode: 'CN', shipmentCount: 40, totalAmountUsd: 8_000_000, lastShipmentDate: '2026-04-15' },
    ],
    topHsCodes: [
      { code: '8517.12', description: 'Smartphones and mobile phones', count: 60, totalAmountUsd: 15_000_000 },
      { code: '8471.30', description: 'Portable computers', count: 45, totalAmountUsd: 11_000_000 },
      { code: '6110.20', description: 'Knitted sweaters and pullovers', count: 38, totalAmountUsd: 6_000_000 },
    ],
    shipments: generateShipments('Amazon EU Sarl', 'DE', 'CN', 20),
    scoreBreakdown: { frequency: 100, trend: 92, diversification: 95, recency: 100 },
    aiSummary: '欧洲最大电商之一，采购量极大且供应商持续增加，表明品类扩张中。近30天内有4笔装运，采购节奏密集，是高价值目标。',
  },
  {
    id: 'buyer-003',
    companyName: 'Metro AG',
    domain: 'metro-ag.com',
    country: 'Germany',
    countryCode: 'DE',
    totalShipments: 67,
    totalAmountUsd: 8_900_000,
    lastShipmentDate: '2026-03-10',
    firstShipmentDate: '2024-02-15',
    supplierCount: 4,
    avgShipmentAmount: 132_835,
    purchaseIntentScore: 58,
    topSuppliers: [
      { name: 'Shandong FoodTech Co.', country: 'China', countryCode: 'CN', shipmentCount: 30, totalAmountUsd: 4_200_000 },
      { name: 'Zhejiang FreshExport', country: 'China', countryCode: 'CN', shipmentCount: 20, totalAmountUsd: 2_800_000 },
    ],
    topHsCodes: [
      { code: '0304.87', description: 'Frozen fish fillets', count: 25, totalAmountUsd: 3_500_000 },
      { code: '2002.90', description: 'Tomatoes prepared/preserved', count: 22, totalAmountUsd: 2_800_000 },
    ],
    shipments: generateShipments('Metro AG', 'DE', 'CN', 15),
    scoreBreakdown: { frequency: 55, trend: 50, diversification: 45, recency: 72 },
    aiSummary: '德国零售巨头，采购稳定但增速放缓，供应商较集中。80天前最后一笔装运，处于观望期，适合以差异化产品切入。',
  },
  {
    id: 'buyer-004',
    companyName: 'Best Buy Co. Inc.',
    domain: 'bestbuy.com',
    country: 'United States',
    countryCode: 'US',
    totalShipments: 89,
    totalAmountUsd: 15_600_000,
    lastShipmentDate: '2026-04-28',
    firstShipmentDate: '2023-08-01',
    supplierCount: 6,
    avgShipmentAmount: 175_280,
    purchaseIntentScore: 75,
    topSuppliers: [
      { name: 'Shenzhen SmartDevice Co.', country: 'China', countryCode: 'CN', shipmentCount: 32, totalAmountUsd: 5_800_000 },
      { name: 'Suzhou Audio Tech', country: 'China', countryCode: 'CN', shipmentCount: 25, totalAmountUsd: 4_200_000 },
    ],
    topHsCodes: [
      { code: '8528.72', description: 'Television receivers', count: 30, totalAmountUsd: 5_500_000 },
      { code: '8518.22', description: 'Loudspeakers', count: 25, totalAmountUsd: 3_800_000 },
    ],
    shipments: generateShipments('Best Buy Co. Inc.', 'US', 'CN', 15),
    scoreBreakdown: { frequency: 72, trend: 78, diversification: 68, recency: 82 },
    aiSummary: '北美消费电子零售龙头，近半年采购额增长15%，新增2家供应商，采购意愿积极。适合消费电子及智能硬件品类切入。',
  },
  {
    id: 'buyer-005',
    companyName: 'Auchan Retail',
    domain: 'auchan-retail.com',
    country: 'France',
    countryCode: 'FR',
    totalShipments: 45,
    totalAmountUsd: 5_200_000,
    lastShipmentDate: '2026-01-15',
    firstShipmentDate: '2024-05-20',
    supplierCount: 3,
    avgShipmentAmount: 115_555,
    purchaseIntentScore: 35,
    topSuppliers: [
      { name: 'Hebei Textile Group', country: 'China', countryCode: 'CN', shipmentCount: 25, totalAmountUsd: 3_000_000 },
    ],
    topHsCodes: [
      { code: '6109.10', description: 'T-shirts, cotton, knitted', count: 20, totalAmountUsd: 2_200_000 },
      { code: '6204.62', description: 'Women trousers, cotton', count: 15, totalAmountUsd: 1_800_000 },
    ],
    shipments: generateShipments('Auchan Retail', 'FR', 'CN', 10),
    scoreBreakdown: { frequency: 30, trend: 25, diversification: 20, recency: 45 },
    aiSummary: '法国零售商，近半年采购频次下降，供应商高度集中于纺织品类。需关注其采购策略变化，可作为备选客户。',
  },
  {
    id: 'buyer-006',
    companyName: 'Reliance Retail Ltd.',
    domain: 'relianceretail.com',
    country: 'India',
    countryCode: 'IN',
    totalShipments: 112,
    totalAmountUsd: 18_000_000,
    lastShipmentDate: '2026-05-10',
    firstShipmentDate: '2023-03-01',
    supplierCount: 9,
    avgShipmentAmount: 160_714,
    purchaseIntentScore: 88,
    topSuppliers: [
      { name: 'Guangzhou MobileTech', country: 'China', countryCode: 'CN', shipmentCount: 35, totalAmountUsd: 6_500_000 },
      { name: 'Shenzhen IoT Solutions', country: 'China', countryCode: 'CN', shipmentCount: 28, totalAmountUsd: 5_000_000 },
    ],
    topHsCodes: [
      { code: '8517.12', description: 'Smartphones', count: 40, totalAmountUsd: 8_000_000 },
      { code: '8471.30', description: 'Laptops', count: 30, totalAmountUsd: 5_500_000 },
    ],
    shipments: generateShipments('Reliance Retail Ltd.', 'IN', 'CN', 18),
    scoreBreakdown: { frequency: 88, trend: 85, diversification: 82, recency: 95 },
    aiSummary: '印度最大零售集团，采购规模大且增长迅速，供应商多元化程度高。21天前最近装运，采购节奏活跃，是印度市场首选目标。',
  },
  {
    id: 'buyer-007',
    companyName: 'Carrefour S.A.',
    domain: 'carrefour.com',
    country: 'France',
    countryCode: 'FR',
    totalShipments: 78,
    totalAmountUsd: 12_300_000,
    lastShipmentDate: '2026-04-05',
    firstShipmentDate: '2023-06-15',
    supplierCount: 5,
    avgShipmentAmount: 157_692,
    purchaseIntentScore: 68,
    topSuppliers: [
      { name: 'Qingdao Seafood Export', country: 'China', countryCode: 'CN', shipmentCount: 30, totalAmountUsd: 4_500_000 },
      { name: 'Xiamen FrozenFoods Co.', country: 'China', countryCode: 'CN', shipmentCount: 22, totalAmountUsd: 3_800_000 },
    ],
    topHsCodes: [
      { code: '0304.87', description: 'Frozen fish fillets', count: 28, totalAmountUsd: 4_200_000 },
      { code: '0306.17', description: 'Frozen shrimps', count: 25, totalAmountUsd: 3_800_000 },
    ],
    shipments: generateShipments('Carrefour S.A.', 'FR', 'CN', 14),
    scoreBreakdown: { frequency: 65, trend: 62, diversification: 55, recency: 78 },
    aiSummary: '法国零售巨头，冷冻食品采购稳定。近3个月有新供应商加入，采购策略有所调整。适合冷冻海鲜及食品品类切入。',
  },
  {
    id: 'buyer-008',
    companyName: 'Samsung Electronics Co.',
    domain: 'samsung.com',
    country: 'South Korea',
    countryCode: 'KR',
    totalShipments: 198,
    totalAmountUsd: 52_000_000,
    lastShipmentDate: '2026-05-22',
    firstShipmentDate: '2022-01-15',
    supplierCount: 15,
    avgShipmentAmount: 262_626,
    purchaseIntentScore: 94,
    topSuppliers: [
      { name: 'BOE Technology Group', country: 'China', countryCode: 'CN', shipmentCount: 50, totalAmountUsd: 18_000_000 },
      { name: 'Shenzhen FlexPCB Co.', country: 'China', countryCode: 'CN', shipmentCount: 38, totalAmountUsd: 12_000_000 },
    ],
    topHsCodes: [
      { code: '8524.91', description: 'LCD panels', count: 55, totalAmountUsd: 20_000_000 },
      { code: '8534.00', description: 'Printed circuit boards', count: 45, totalAmountUsd: 15_000_000 },
    ],
    shipments: generateShipments('Samsung Electronics Co.', 'KR', 'CN', 20),
    scoreBreakdown: { frequency: 98, trend: 90, diversification: 95, recency: 99 },
    aiSummary: '全球消费电子巨头，供应链庞大且采购量惊人。LCD面板和PCB为核心采购品类，供应商高度多元化，是电子元器件领域的顶级客户。',
  },
  {
    id: 'buyer-009',
    companyName: 'Lidl Stiftung & Co.',
    domain: 'lidl.com',
    country: 'Germany',
    countryCode: 'DE',
    totalShipments: 56,
    totalAmountUsd: 6_800_000,
    lastShipmentDate: '2026-02-20',
    firstShipmentDate: '2024-01-10',
    supplierCount: 4,
    avgShipmentAmount: 121_428,
    purchaseIntentScore: 48,
    topSuppliers: [
      { name: 'Jiangsu FurnitureCraft', country: 'China', countryCode: 'CN', shipmentCount: 22, totalAmountUsd: 2_800_000 },
      { name: 'Zhejiang HomeGoods Co.', country: 'China', countryCode: 'CN', shipmentCount: 18, totalAmountUsd: 2_200_000 },
    ],
    topHsCodes: [
      { code: '9403.60', description: 'Wooden furniture', count: 20, totalAmountUsd: 2_500_000 },
      { code: '9401.61', description: 'Upholstered seats', count: 18, totalAmountUsd: 2_200_000 },
    ],
    shipments: generateShipments('Lidl Stiftung & Co.', 'DE', 'CN', 12),
    scoreBreakdown: { frequency: 45, trend: 40, diversification: 35, recency: 58 },
    aiSummary: '德国折扣零售商，家具家居品类采购中等。近3个月无新装运，采购节奏放缓。可关注其自有品牌扩展计划。',
  },
  {
    id: 'buyer-010',
    companyName: 'Target Corporation',
    domain: 'target.com',
    country: 'United States',
    countryCode: 'US',
    totalShipments: 134,
    totalAmountUsd: 22_000_000,
    lastShipmentDate: '2026-05-18',
    firstShipmentDate: '2023-04-01',
    supplierCount: 10,
    avgShipmentAmount: 164_179,
    purchaseIntentScore: 85,
    topSuppliers: [
      { name: 'Dongguan StyleHome Ltd.', country: 'China', countryCode: 'CN', shipmentCount: 38, totalAmountUsd: 6_500_000 },
      { name: 'Shaoxing Textile Group', country: 'China', countryCode: 'CN', shipmentCount: 30, totalAmountUsd: 5_200_000 },
    ],
    topHsCodes: [
      { code: '6110.30', description: 'Knitted jerseys, synthetic', count: 35, totalAmountUsd: 5_500_000 },
      { code: '9404.90', description: 'Mattress supports & cushions', count: 28, totalAmountUsd: 4_200_000 },
    ],
    shipments: generateShipments('Target Corporation', 'US', 'CN', 18),
    scoreBreakdown: { frequency: 82, trend: 80, diversification: 78, recency: 92 },
    aiSummary: '美国零售巨头，纺织家居品类采购活跃。供应商数量持续增加，13天前最新装运，采购意愿强。适合纺织品及家居用品供应商。',
  },
]

function generateShipments(
  importer: string,
  importerCountry: string,
  exporterCountry: string,
  count: number
): CustomsShipmentRecord[] {
  const shipments: CustomsShipmentRecord[] = []
  const now = new Date()
  const exporters = [
    'Shenzhen HuaTech Electronics',
    'Ningbo SmartHome Co.',
    'Guangzhou PowerTools Ltd.',
    'Dongguan LED Solutions',
    'Foshan Ceramics Group',
  ]
  const hsCodes = ['8541.40', '8471.30', '9405.42', '8467.21', '6907.21']
  const ports = ['Shenzhen', 'Shanghai', 'Ningbo', 'Guangzhou', 'Xiamen']

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 365)
    const date = new Date(now.getTime() - daysAgo * 86400000)
    shipments.push({
      importerName: importer,
      importerCountry: importerCountry === 'US' ? 'United States' : importerCountry === 'DE' ? 'Germany' : importerCountry,
      importerCountryCode: importerCountry,
      exporterName: exporters[i % exporters.length],
      exporterCountry: 'China',
      exporterCountryCode: exporterCountry,
      hsCode: hsCodes[i % hsCodes.length],
      shipmentDate: date.toISOString().split('T')[0],
      amountUsd: Math.floor(100_000 + Math.random() * 400_000),
      quantity: Math.floor(100 + Math.random() * 5000),
      unitOfMeasure: 'units',
      originPort: ports[i % ports.length],
      destinationPort: importerCountry === 'US' ? 'Los Angeles' : importerCountry === 'DE' ? 'Hamburg' : 'Local Port',
      source: 'mock',
      sourceId: `mock-shipment-${i}`,
    })
  }
  return shipments
}

export class MockCustomsProvider implements CustomsProvider {
  name = 'mock'

  isConfigured(): boolean {
    return true // mock 始终可用
  }

  async searchBuyers(input: CustomsSearchInput): Promise<CustomsBuyerResult[]> {
    // 模拟网络延迟
    await new Promise((r) => setTimeout(r, 300))

    let results = [...MOCK_BUYERS]

    // 按关键词过滤
    if (input.keyword) {
      const kw = input.keyword.toLowerCase()
      results = results.filter(
        (b) =>
          b.companyName.toLowerCase().includes(kw) ||
          b.topHsCodes.some((h) => h.description?.toLowerCase().includes(kw))
      )
    }

    // 按国家过滤
    if (input.country) {
      const c = input.country.toLowerCase()
      results = results.filter(
        (b) =>
          b.country?.toLowerCase().includes(c) ||
          b.countryCode?.toLowerCase() === c
      )
    }

    // 按 HS 编码过滤
    if (input.hsCode) {
      const code = input.hsCode.replace('.', '')
      results = results.filter((b) =>
        b.topHsCodes.some((h) => h.code.replace('.', '').startsWith(code))
      )
    }

    const page = input.page || 1
    const perPage = input.perPage || 25
    const start = (page - 1) * perPage

    return results.slice(start, start + perPage).map((b) => ({
      id: b.id,
      companyName: b.companyName,
      domain: b.domain,
      country: b.country,
      countryCode: b.countryCode,
      totalShipments: b.totalShipments,
      totalAmountUsd: b.totalAmountUsd,
      lastShipmentDate: b.lastShipmentDate,
      supplierCount: b.supplierCount,
      topSuppliers: b.topSuppliers,
      topHsCodes: b.topHsCodes,
      purchaseIntentScore: b.purchaseIntentScore,
      importedAsContact: false,
    }))
  }

  async getBuyerDetail(buyerId: string): Promise<CustomsBuyerDetail | null> {
    await new Promise((r) => setTimeout(r, 200))
    return MOCK_BUYERS.find((b) => b.id === buyerId) || null
  }
}
