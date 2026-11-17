import { http } from './http'

export const usersApi = {
  profile: () => http.get('/users/profile').then(({ data }) => data),
  updateProfile: (body) => http.put('/users/profile', body).then(({ data }) => data),
  list: (params) => http.get('/users', { params }).then(({ data }) => data),
  updateAvatar: (form) => http.put('/users/avatar', form, { headers: { 'Content-Type': undefined } }).then(({ data }) => data),
}
