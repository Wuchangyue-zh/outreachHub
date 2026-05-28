import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
  role: string
  tenantId?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  initFromCookie: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: (user, token) => {
    set({ user, token, isAuthenticated: true, isLoading: false })
    document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; sameSite=lax`
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    document.cookie = 'auth-token=; path=/; max-age=0'
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  initFromCookie: () => {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find((c) => c.trim().startsWith('auth-token='))

    if (authCookie) {
      const token = authCookie.trim().split('=')[1]
      if (token) {
        // We'll validate the token via API on the server side
        set({ token, isAuthenticated: true, isLoading: false })
        return
      }
    }

    set({ isLoading: false })
  },
}))

interface UIState {
  sidebarCollapsed: boolean
  mobileMenuOpen: boolean
  activeTab: string | null
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
  setActiveTab: (tab: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  activeTab: null,

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
  },

  setMobileMenuOpen: (open) => {
    set({ mobileMenuOpen: open })
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab })
  },
}))