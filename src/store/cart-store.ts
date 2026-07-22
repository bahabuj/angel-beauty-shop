import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  slug: string
  freeShipping?: boolean
  /** Variant id (null when product has no variants / single "Standard" variant) */
  variantId?: string | null
  /** Variant display name, e.g. "Small", "250ml", "Big" */
  variantName?: string | null
  /** Variant SKU (optional) */
  sku?: string | null
}

interface CartState {
  items: CartItem[]
  /**
   * Hydration flag — true once Zustand persist has finished rehydrating the
   * store from localStorage. Components that show an "empty cart" state MUST
   * wait for `_hasHydrated === true` before doing so, otherwise the empty
   * state flashes for ~1s on every page load (because `items` is `[]` until
   * localStorage is read on the client).
   */
  _hasHydrated: boolean
  /**
   * Add an item to the cart.
   * - Items are deduplicated by composite key `${id}:${variantId}` so the
   *   same product in two different variants are separate cart lines.
   * - If the composite key is NOT already in the cart: adds it with the
   *   given quantity (default 1). Returns true.
   * - If the composite key IS already in the cart and `allowIncrement` is
   *   true: increments quantity. Returns true.
   * - If the composite key IS already in the cart and `allowIncrement` is
   *   false (default): does NOT add. Returns false. The caller should show
   *   "Already in cart" feedback and use updateQuantity() instead.
   */
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }, allowIncrement?: boolean) => boolean
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getSubtotal: () => number
  getItemCount: () => number
  /** Internal: called by persist's onRehydrateStorage. Do not call manually. */
  _setHasHydrated: (state: boolean) => void
}

/** Build the composite dedupe key for a cart item. */
export function cartItemKey(id: string, variantId?: string | null): string {
  return `${id}:${variantId ?? ''}`
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      _hasHydrated: false,
      addItem: (item, allowIncrement = false) => {
        const qty = item.quantity ?? 1
        const key = cartItemKey(item.id, item.variantId)
        const items = get().items
        const existing = items.find((i) => cartItemKey(i.id, i.variantId) === key)
        if (existing) {
          if (allowIncrement) {
            set({
              items: items.map((i) =>
                cartItemKey(i.id, i.variantId) === key ? { ...i, quantity: i.quantity + qty } : i
              ),
            })
            return true
          }
          return false
        } else {
          set({ items: [...items, { ...item, quantity: qty }] })
          return true
        }
      },
      removeItem: (key) => {
        set({ items: get().items.filter((i) => cartItemKey(i.id, i.variantId) !== key) })
      },
      updateQuantity: (key, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => cartItemKey(i.id, i.variantId) !== key) })
        } else {
          set({
            items: get().items.map((i) =>
              cartItemKey(i.id, i.variantId) === key ? { ...i, quantity } : i
            ),
          })
        }
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      _setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'angel-beauty-cart',
      // ─── Hydration tracking ────────────────────────────────────────────────
      // onRehydrateStorage is called by Zustand persist once the store has
      // finished rehydrating from localStorage. We flip _hasHydrated to true
      // so components can stop showing the loading state and start checking
      // the real cart contents.
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true)
      },
    }
  )
)

/**
 * Convenience hook: returns true once the cart store has finished rehydrating
 * from localStorage. Use this in components that render an "empty cart" state
 * to avoid the flash of empty content during initial hydration.
 *
 * Usage:
 *   const hasHydrated = useCartHydrated()
 *   if (!hasHydrated) return <LoadingSpinner />
 *   if (items.length === 0) return <EmptyCart />
 */
export function useCartHydrated(): boolean {
  return useCartStore((s) => s._hasHydrated)
}
