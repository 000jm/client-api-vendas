import { create } from 'zustand'
import { productsApi } from '../api/products'
import { errorMessage } from '../api/http'

export const useProductStore = create((set, get) => ({
  items: [], total: 0, currentPage: 1, perPage: 10, lastPage: 0,
  loading: false, error: '', filter: '', sort: 'created_at', sortDir: 'desc',
  fetch: async (overrides = {}) => {
    const state = { ...get(), ...overrides }
    set({ loading: true, error: '', ...overrides })
    try {
      const result = await productsApi.list({ page: state.currentPage, per_page: state.perPage, filter: state.filter || undefined, sort: state.sort, sort_dir: state.sortDir })
      const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : []
      set({
        items,
        total: result?.total ?? items.length,
        currentPage: result?.current_page ?? state.currentPage,
        perPage: result?.per_page ?? state.perPage,
        lastPage: result?.last_page ?? (items.length ? state.currentPage : 0),
      })
    } catch (error) { set({ error: errorMessage(error) }) }
    finally { set({ loading: false }) }
  },
  save: async (id, body) => id ? productsApi.update(id, body) : productsApi.create(body),
  remove: async (id) => { await productsApi.remove(id); await get().fetch() },
}))
