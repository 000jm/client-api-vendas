import { http } from './http'

export const productsApi = {
  list: (params) => http.get('/products', { params }).then(({ data }) => data),
  create: (body) => http.post('/products', body).then(({ data }) => data),
  update: (id, body) => http.put(`/products/${id}`, body).then(({ data }) => data),
  remove: (id) => http.delete(`/products/${id}`),
}
