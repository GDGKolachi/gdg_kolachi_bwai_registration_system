import api from '../../../axios-instance';

export const adminEventApi = {
  getAll: () => api.get('/admin/events').then(res => res.data),
  create: (data) => api.post('/admin/events', data).then(res => res.data),
  update: (id, data) => api.patch(`/admin/events/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/admin/events/${id}`).then(res => res.data),
  lockAcknowledgements: (id) => api.post(`/admin/events/${id}/lock-acknowledgements`).then(res => res.data),
  unlockAcknowledgements: (id) => api.post(`/admin/events/${id}/unlock-acknowledgements`).then(res => res.data),
};
