import api from '../../axios-instance';

export const workshopApi = {
  getAll: () => api.get('/workshops').then(res => res.data),
  getById: (id) => api.get(`/workshops/${id}`).then(res => res.data),
};
