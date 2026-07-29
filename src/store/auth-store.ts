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
  isLoading: boolean
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  /** Cookie is httpOnly — client cannot read it. Session is validated via /api/users/me. */
  initFromCookie: () => void
}

/**
 * Client auth UI state only.
 * JWT lives in httpOnly `auth-token` cookie (set by /api/auth/*).
 * Do not write auth-token via document.cookie — browsers cannot read httpOnly cookies.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: (user) => {
    set({ user, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  initFromCookie: () => {
    // httpOnly cookie is invisible to JS; mark loading done and let middleware /api decide.
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
