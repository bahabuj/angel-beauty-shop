import { create } from 'zustand'

interface UIState {
  isMobileMenuOpen: boolean
  isChatOpen: boolean
  searchQuery: string
  selectedCategory: string
  sortBy: string
  priceRange: [number, number]
  setMobileMenuOpen: (open: boolean) => void
  setChatOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string) => void
  setSortBy: (sort: string) => void
  setPriceRange: (range: [number, number]) => void
}

export const useUIStore = create<UIState>()((set) => ({
  isMobileMenuOpen: false,
  isChatOpen: false,
  searchQuery: '',
  selectedCategory: 'all',
  sortBy: 'newest',
  priceRange: [0, 100000],
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setChatOpen: (open) => set({ isChatOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setPriceRange: (range) => set({ priceRange: range }),
}))
