import axios from 'axios'

const BASE_URL = 'https://api.rocketreach.co/v1'
const API_KEY = process.env.ROCKETREACH_API_KEY

interface RocketReachResponse<T> {
  data: T
  status: string
  error?: string
}

export interface Person {
  _id: string
  name: string
  current_title: string
  current_employer: string
  current_employer_id: number
  linkedin_url: string
  location: string
  city: string
  country: string
  country_code: string
  emails?: Array<{ address: string; type: string }>
  phones?: string[]
  profile_pic: string
  teaser?: {
    emails: string[]
    phones: string[]
  }
}

export interface Company {
  _id: number
  name: string
  email_domain: string
  industry_str: string
  city: string
  region: string
  country_code: string
  ticker_symbol?: string
  website?: string
  size?: string
  employee_count?: number
}

export async function searchPeople(params: {
  name?: string
  title?: string
  company?: string
  location?: string
  domain?: string
  page?: number
  limit?: number
}): Promise<Person[]> {
  if (!API_KEY) return []

  try {
    const response = await axios.get(`${BASE_URL}/people/search`, {
      params: {
        api_key: API_KEY,
        ...params,
      },
    })
    return response.data.data || []
  } catch (error) {
    console.error('RocketReach searchPeople error:', error)
    return []
  }
}

export async function getPersonDetails(id: string): Promise<Person | null> {
  if (!API_KEY) return null

  try {
    const response = await axios.get(`${BASE_URL}/people/profile`, {
      params: {
        api_key: API_KEY,
        profile_id: id,
      },
    })
    return response.data.data || null
  } catch (error) {
    console.error('RocketReach getPersonDetails error:', error)
    return null
  }
}

export async function searchCompanies(params: {
  name?: string
  domain?: string
  industry?: string
  location?: string
  page?: number
  limit?: number
}): Promise<Company[]> {
  if (!API_KEY) return []

  try {
    const response = await axios.get(`${BASE_URL}/companies/search`, {
      params: {
        api_key: API_KEY,
        ...params,
      },
    })
    return response.data.data || []
  } catch (error) {
    console.error('RocketReach searchCompanies error:', error)
    return []
  }
}

export async function getCompanyDetails(id: string): Promise<Company | null> {
  if (!API_KEY) return null

  try {
    const response = await axios.get(`${BASE_URL}/companies/profile`, {
      params: {
        api_key: API_KEY,
        company_id: id,
      },
    })
    return response.data.data || null
  } catch (error) {
    console.error('RocketReach getCompanyDetails error:', error)
    return null
  }
}

export async function getCompanyEmployees(companyId: string, params?: {
  title?: string
  page?: number
  limit?: number
}): Promise<Person[]> {
  if (!API_KEY) return []

  try {
    const response = await axios.get(`${BASE_URL}/companies/employees`, {
      params: {
        api_key: API_KEY,
        company_id: companyId,
        ...params,
      },
    })
    return response.data.data || []
  } catch (error) {
    console.error('RocketReach getCompanyEmployees error:', error)
    return []
  }
}
