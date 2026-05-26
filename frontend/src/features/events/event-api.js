import api from '../../axios-instance';

export const eventApi = {
  getAll: () => api.get('/events').then(res => res.data),
  getById: (id) => api.get(`/events/${id}`).then(res => res.data),
};
