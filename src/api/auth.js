import { http } from './http'

export const authApi = {
  login: (body) => http.post('/auth/login', body).then(({ data }) => data),
  checkEmailStatus: (email, config) => http.post('/auth/email-status', { email }, config).then(({ data }) => data),
  register: (body) => http.post('/users', body).then(({ data }) => data),
  forgotPassword: (body) => http.post('/password/forgot', body),
  resetPassword: (body) => http.post('/password/reset', body),
}
