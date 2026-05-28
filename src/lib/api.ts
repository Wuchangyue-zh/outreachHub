import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  // For client-side requests, get token from cookie
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find((c) => c.trim().startsWith('auth-token='))
    if (authCookie) {
      const token = authCookie.trim().split('=')[1]
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  }
  return config
})

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status

      if (status === 401) {
        // Redirect to login on auth errors
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }

      if (status === 429) {
        // Rate limiting
        return Promise.reject(new Error('请求过于频繁，请稍后重试'))
      }
    }

    return Promise.reject(error)
  }
)

export default api

// Typed API helpers
export async function apiGet<T>(url: string, params?: Record<string, string>): Promise<{ success: boolean; data: T; pagination?: any }> {
  const res = await api.get(url, { params })
  return res.data
}

export async function apiPost<T>(url: string, data?: any): Promise<{ success: boolean; data: T; error?: string }> {
  const res = await api.post(url, data)
  return res.data
}

export async function apiPut<T>(url: string, data?: any): Promise<{ success: boolean; data: T }> {
  const res = await api.put(url, data)
  return res.data
}

export async function apiDelete<T>(url: string): Promise<{ success: boolean; data?: T; message?: string }> {
  const res = await api.delete(url)
  return res.data
}