import api from '../../../axios-instance';

export const eventTypesApi = {
  // Public: used by the admin event-create selector
  list: () => api.get('/event-types?active=true').then(res => res.data),
  // Admin
  adminList: () => api.get('/admin/event-types').then(res => res.data),
  create: (data) => api.post('/admin/event-types', data).then(res => res.data),
  update: (id, data) => api.patch(`/admin/event-types/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/admin/event-types/${id}`).then(res => res.data),
};
