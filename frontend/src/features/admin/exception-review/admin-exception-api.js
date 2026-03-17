import api from '../../../axios-instance';

export const adminExceptionApi = {
  getAll: () => api.get('/admin/exceptions').then(res => res.data),
  approve: (id) => api.patch(`/admin/exceptions/${id}/approve`).then(res => res.data),
  reject: (id) => api.patch(`/admin/exceptions/${id}/reject`).then(res => res.data),
};
