import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({ baseURL })

const TOKEN_KEY = 'ac_access'
const REFRESH_KEY = 'ac_refresh'

export const tokenStore = {
  get access() {
    return localStorage.getItem(TOKEN_KEY)
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(TOKEN_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

api.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      tokenStore.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

/** Extrait un message d'erreur lisible d'une réponse DRF. */
export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'string') return data
    if (data?.detail) return data.detail
    if (data && typeof data === 'object') {
      const first = Object.values(data)[0]
      if (Array.isArray(first)) return String(first[0])
      if (typeof first === 'string') return first
    }
  }
  return 'Une erreur est survenue.'
}
