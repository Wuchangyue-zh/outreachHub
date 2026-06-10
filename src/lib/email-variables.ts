/**
 * Replace {{variable}} placeholders in email subject/body (case-insensitive keys).
 */
export function applyEmailVariables(
  text: string,
  variables: Record<string, string>
): string {
  if (!text) return text

  let result = text
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value ?? '')
  }
  return result
}

export interface ContactVariableSource {
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  title?: string | null
  country?: string | null
  industry?: string | null
  company?: { name?: string | null; industry?: string | null } | null
}

export function buildContactVariables(
  contact: ContactVariableSource,
  primaryEmail?: string
): Record<string, string> {
  const companyName = contact.company?.name || ''
  const industry = contact.company?.industry || contact.industry || ''
  const country = contact.country || ''

  return {
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    fullName: contact.fullName || '',
    FirstName: contact.firstName || '',
    LastName: contact.lastName || '',
    FullName: contact.fullName || '',
    companyName,
    CompanyName: companyName,
    industry,
    Industry: industry,
    country,
    Country: country,
    title: contact.title || '',
    Title: contact.title || '',
    email: primaryEmail || '',
    Email: primaryEmail || '',
  }
}
