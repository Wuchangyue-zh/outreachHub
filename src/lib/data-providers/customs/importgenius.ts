/**
 * N2a: ImportGenius 海关数据 Provider 适配器
 * API 文档：https://www.importgenius.com/api
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

const BASE_URL = process.env.CUSTOMS_API_URL || 'https://api.importgenius.com'

export class ImportGeniusProvider implements CustomsProvider {
  name = 'importgenius'

  isConfigured(): boolean {
    return !!process.env.CUSTOMS_API_KEY
  }

  async searchBuyers(input: CustomsSearchInput): Promise<CustomsBuyerResult[]> {
    const apiKey = process.env.CUSTOMS_API_KEY
    if (!apiKey) return []

    try {
      const params = new URLSearchParams()
      if (input.hsCode) params.set('hs_code', input.hsCode)
      if (input.country) params.set('country', input.country)
      if (input.keyword) params.set('q', input.keyword)
      if (input.dateFrom) params.set('date_from', input.dateFrom)
      if (input.dateTo) params.set('date_to', input.dateTo)
      params.set('page', String(input.page || 1))
      params.set('per_page', String(input.perPage || 25))

      const resp = await fetch(`${BASE_URL}/search?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!resp.ok) {
        console.error(`[ImportGenius] searchBuyers ${resp.status}: ${await resp.text()}`)
        return []
      }

      const data = await resp.json()
      const results = data.results || data.buyers || []

      return results.map((r: Record<string, unknown>) => this.mapBuyerResult(r))
    } catch (error) {
      console.error('[ImportGenius] searchBuyers error:', error)
      return []
    }
  }

  async getBuyerDetail(buyerId: string): Promise<CustomsBuyerDetail | null> {
    const apiKey = process.env.CUSTOMS_API_KEY
    if (!apiKey) return null

    try {
      const resp = await fetch(`${BASE_URL}/buyers/${encodeURIComponent(buyerId)}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!resp.ok) return null

      const data = await resp.json()
      return this.mapBuyerDetail(data)
    } catch (error) {
      console.error('[ImportGenius] getBuyerDetail error:', error)
      return null
    }
  }

  private mapBuyerResult(r: Record<string, unknown>): CustomsBuyerResult {
    const suppliers = (r.suppliers || r.top_suppliers || []) as Record<string, unknown>[]
    const hsCodes = (r.hs_codes || r.top_hs_codes || []) as Record<string, unknown>[]

    return {
      id: (r.id || r.company_name || '') as string,
      companyName: (r.company_name || r.name || '') as string,
      domain: r.domain as string | undefined,
      country: (r.country || r.importer_country) as string | undefined,
      countryCode: (r.country_code || r.importer_country_code) as string | undefined,
      totalShipments: (r.total_shipments || r.shipment_count || 0) as number,
      totalAmountUsd: (r.total_amount_usd || r.total_value || 0) as number,
      lastShipmentDate: (r.last_shipment_date || r.most_recent_date) as string | undefined,
      supplierCount: (r.supplier_count || suppliers.length || 0) as number,
      topSuppliers: suppliers.map((s) => ({
        name: (s.name || s.company_name || '') as string,
        country: s.country as string | undefined,
        countryCode: s.country_code as string | undefined,
        shipmentCount: (s.shipment_count || s.count || 0) as number,
        totalAmountUsd: (s.total_amount_usd || s.total_value || 0) as number,
        lastShipmentDate: s.last_shipment_date as string | undefined,
      })),
      topHsCodes: hsCodes.map((h) => ({
        code: (h.code || h.hs_code || '') as string,
        description: (h.description || h.hs_description) as string | undefined,
        count: (h.count || h.shipment_count || 0) as number,
        totalAmountUsd: (h.total_amount_usd || h.total_value || 0) as number,
      })),
    }
  }

  private mapBuyerDetail(data: Record<string, unknown>): CustomsBuyerDetail {
    const base = this.mapBuyerResult(data)
    const shipments = ((data.shipments || []) as Record<string, unknown>[]).map(
      (s): CustomsShipmentRecord => ({
        importerName: (s.importer_name || base.companyName) as string,
        importerCountry: s.importer_country as string | undefined,
        importerCountryCode: s.importer_country_code as string | undefined,
        exporterName: (s.exporter_name || '') as string,
        exporterCountry: s.exporter_country as string | undefined,
        exporterCountryCode: s.exporter_country_code as string | undefined,
        hsCode: (s.hs_code || s.hsCode) as string | undefined,
        hsDescription: (s.hs_description || s.hsDescription) as string | undefined,
        productDescription: (s.product_description || s.description) as string | undefined,
        shipmentDate: (s.shipment_date || s.date) as string | undefined,
        quantity: s.quantity as number | undefined,
        unitOfMeasure: (s.unit_of_measure || s.uom) as string | undefined,
        amountUsd: (s.amount_usd || s.value) as number | undefined,
        currency: s.currency as string | undefined,
        originPort: (s.origin_port || s.port_of_origin) as string | undefined,
        destinationPort: (s.destination_port || s.port_of_destination) as string | undefined,
        source: 'importgenius',
        sourceId: s.id as string | undefined,
        raw: s,
      })
    )

    return {
      ...base,
      firstShipmentDate: (data.first_shipment_date || data.earliest_date) as string | undefined,
      avgShipmentAmount: data.avg_shipment_amount as number | undefined,
      shipments,
    }
  }
}
