import { parse } from 'csv-parse/sync'
import { prisma } from './prisma'

export interface CSVRow {
  [key: string]: string
}

export interface ColumnMapping {
  [csvColumn: string]: string // Maps CSV column to database field
}

export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

export interface ParseResult {
  headers: string[]
  rows: CSVRow[]
  totalRows: number
}

/**
 * Parse CSV content and return headers and rows
 */
export function parseCSV(content: string): ParseResult {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  })

  if (records.length === 0) {
    return { headers: [], rows: [], totalRows: 0 }
  }

  const headers = Object.keys(records[0] as Record<string, string>)

  return {
    headers,
    rows: records as CSVRow[],
    totalRows: records.length,
  }
}

/**
 * Validate a single row based on required fields
 */
function validateRow(row: CSVRow, mapping: ColumnMapping): string | null {
  // Check required fields
  const requiredFields = ['email', 'firstName']

  for (const field of requiredFields) {
    const csvColumn = Object.keys(mapping).find(key => mapping[key] === field)
    if (!csvColumn || !row[csvColumn] || row[csvColumn].trim() === '') {
      return `Missing required field: ${field}`
    }
  }

  // Validate email format
  const emailColumn = Object.keys(mapping).find(key => mapping[key] === 'email')
  if (emailColumn && row[emailColumn]) {
    const email = row[emailColumn].trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return `Invalid email format: ${email}`
    }
  }

  return null
}

/**
 * Map CSV row to contact data using column mapping
 */
function mapRowToContact(row: CSVRow, mapping: ColumnMapping): any {
  const contact: any = {}

  for (const [csvColumn, dbField] of Object.entries(mapping)) {
    if (row[csvColumn] !== undefined && row[csvColumn] !== '') {
      contact[dbField] = row[csvColumn].trim()
    }
  }

  // Generate fullName if not provided
  if (!contact.fullName && (contact.firstName || contact.lastName)) {
    contact.fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
  }

  return contact
}

/**
 * Import contacts from CSV data
 */
export async function importContacts(
  rows: CSVRow[],
  mapping: ColumnMapping,
  tenantId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    total: rows.length,
    success: 0,
    failed: 0,
    errors: [],
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 1

    try {
      // Validate row
      const validationError = validateRow(row, mapping)
      if (validationError) {
        result.errors.push({ row: rowNumber, error: validationError })
        result.failed++
        continue
      }

      // Map row to contact data
      const contactData = mapRowToContact(row, mapping)

      // Check if contact already exists (by email address)
      const existingContact = await prisma.contact.findFirst({
        where: {
          tenantId,
          emails: {
            some: {
              address: contactData.email || '',
            },
          },
        },
        include: {
          emails: true,
        },
      })

      if (existingContact) {
        // Update existing contact
        await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            ...contactData,
            updatedAt: new Date(),
          },
        })
      } else {
        // Create new contact
        await prisma.contact.create({
          data: {
            ...contactData,
            tenantId,
            status: 'NEW',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }

      result.success++
    } catch (error: any) {
      result.errors.push({
        row: rowNumber,
        error: error.message || 'Unknown error',
      })
      result.failed++
    }
  }

  return result
}

/**
 * Get suggested column mapping based on CSV headers
 */
export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const fieldPatterns: { [field: string]: RegExp[] } = {
    email: [/email/i, /e-mail/i, /mail/i],
    firstName: [/first.?name/i, /given.?name/i, /fname/i],
    lastName: [/last.?name/i, /surname/i, /family.?name/i, /lname/i],
    fullName: [/full.?name/i, /name/i, /contact.?name/i],
    company: [/company/i, /organization/i, /org/i, /business/i],
    title: [/title/i, /job.?title/i, /position/i, /role/i],
    phone: [/phone/i, /tel/i, /telephone/i, /mobile/i],
    country: [/country/i, /nation/i],
    city: [/city/i, /town/i],
    industry: [/industry/i, /sector/i],
    tags: [/tags/i, /labels/i, /categories/i],
  }

  for (const header of headers) {
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      if (patterns.some(pattern => pattern.test(header))) {
        mapping[header] = field
        break
      }
    }
  }

  return mapping
}
