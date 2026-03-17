import api from '../../axios-instance';

export const exceptionApi = {
  submit: (data) => api.post('/exceptions', data).then(res => res.data),
  getByEmail: (email) => api.get(`/exceptions?email=${encodeURIComponent(email)}`).then(res => res.data),
};
