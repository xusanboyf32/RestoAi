import { create } from 'zustand'

const useCartStore = create((set, get) => ({
  items: [],
  tableSessionId: null,

  setSession: (id) => set({ tableSessionId: id }),

  add: (food) => {
    const items  = get().items
    const exists = items.find((i) => i.id === food.id)
    if (exists) {
      set({ items: items.map((i) => i.id === food.id ? { ...i, qty: i.qty + 1 } : i) })
    } else {
      set({ items: [...items, { ...food, qty: 1 }] })
    }
  },

  increment: (id) =>
    set({ items: get().items.map((i) => i.id === id ? { ...i, qty: i.qty + 1 } : i) }),

  decrement: (id) => {
    const items = get().items
    const item  = items.find((i) => i.id === id)
    if (!item) return
    if (item.qty === 1) {
      set({ items: items.filter((i) => i.id !== id) })
    } else {
      set({ items: items.map((i) => i.id === id ? { ...i, qty: i.qty - 1 } : i) })
    }
  },

  remove:     (id) => set({ items: get().items.filter((i) => i.id !== id) }),
  clear:      ()   => set({ items: [] }),
  totalQty:   ()   => get().items.reduce((s, i) => s + i.qty, 0),
  totalPrice: ()   => get().items.reduce((s, i) => s + (i.discounted_price ?? i.price) * i.qty, 0),
}))

export default useCartStore