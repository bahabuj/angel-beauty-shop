import { create } from 'zustand'

export type Page =
  | 'home'
  | 'shop'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'about'
  | 'contact'
  | 'account'
  | 'auth'
  | 'privacy'
  | 'terms'
  | 'shipping'
  | 'admin'
  | 'order-success'
  | 'checkout-failed'
  | '404'

interface NavState {
  currentPage: Page
  pageParams: Record<string, string>
  navigate: (page: Page, params?: Record<string, string>) => void
}

export const useNavStore = create<NavState>()((set, get) => ({
  currentPage: 'home',
  pageParams: {},
  navigate: (page, params = {}) => {
    const current = get()
    // Skip if navigating to the same page with same params
    if (current.currentPage === page && JSON.stringify(current.pageParams) === JSON.stringify(params)) {
      return
    }
    set({ currentPage: page, pageParams: params })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Update hash for browser history
    const hash = params.slug ? `${page}/${params.slug}` : page
    window.history.pushState({ page, params }, '', `#${hash}`)
  },
}))
