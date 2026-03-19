import { create } from 'zustand'

const useThemeStore = create((set) => ({
  isDark: true,

  init: () => {
    document.documentElement.classList.add('dark')
  },

  toggle: () =>
    set((state) => {
      const next = !state.isDark
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return { isDark: next }
    }),
}))

export default useThemeStore