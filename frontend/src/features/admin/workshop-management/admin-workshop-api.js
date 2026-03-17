import api from '../../../axios-instance';

export const adminWorkshopApi = {
  getAll: () => api.get('/admin/workshops').then(res => res.data),
  create: (data) => api.post('/admin/workshops', data).then(res => res.data),
  update: (id, data) => api.patch(`/admin/workshops/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/admin/workshops/${id}`).then(res => res.data),
};
