import { create } from 'zustand'
import api from '../api/axios'

const useAuthStore = create((set) => ({
  user:  null,
  token: localStorage.getItem('access_token') || null,
  role:  localStorage.getItem('role') || null,

  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { access_token, refresh_token, role } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('role', role)
    set({ token: access_token, role })
    return role
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me')
      set({ user: res.data })
      return res.data
    } catch {
      return null
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.clear()
    set({ user: null, token: null, role: null })
  },
}))

export default useAuthStore