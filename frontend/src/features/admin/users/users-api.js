import api from '../../../axios-instance';

export const usersApi = {
  getAll: (page = 1, limit = 20) => api.get(`/admin/users?page=${page}&limit=${limit}`).then(res => res.data),
  create: (data) => api.post('/admin/users', data).then(res => res.data),
  update: (id, data) => api.patch(`/admin/users/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/admin/users/${id}`).then(res => res.data),
};
