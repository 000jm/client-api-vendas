import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const defaultApiUrl = import.meta.env.DEV
  ? `${window.location.origin}/api`
  : undefined

export const http = axios.create({
  baseURL: configuredApiUrl || defaultApiUrl,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('mercado_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use((response) => response, (error) => {
  const isLoginRequest = error.config?.url?.replace(/^\//, '') === 'auth/login'
  if (error.response?.status === 401 && !isLoginRequest) {
    localStorage.removeItem('mercado_token')
    window.dispatchEvent(new Event('mercado:unauthorized'))
  }
  return Promise.reject(error)
})

export function errorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return 'Não foi possível conectar à API. Confira se a API está iniciada e se o proxy /api está ativo.'
  }
  return error.message || 'Não foi possível concluir. Tente novamente.'
}
