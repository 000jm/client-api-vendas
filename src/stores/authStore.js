import { create } from 'zustand'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('mercado_token'),
  user: null,
  loading: false,
  error: '',
  login: async (credentials) => {
    set({ loading: true, error: '' })
    try {
      const result = await authApi.login(credentials)
      localStorage.setItem('mercado_token', result.access_token)
      set({ token: result.access_token })
      await get().hydrate()
      return true
    } catch (error) {
      const status = error.response?.status
      const message = error.response?.data?.message || (status === 401
        ? 'Credenciais inválidas.'
        : status >= 500 || !error.response
          ? 'Não foi possível conectar à API agora. Tente novamente em instantes.'
          : 'Não foi possível entrar com esses dados.')
      set({ error: message })
      return false
    } finally { set({ loading: false }) }
  },
  hydrate: async () => {
    if (!get().token) return
    try { set({ user: await usersApi.profile() }) } catch { set({ user: null }) }
  },
  logout: () => { localStorage.removeItem('mercado_token'); set({ token: null, user: null }) },
  clearError: () => set({ error: '' }),
}))
