import api from '../../../axios-instance';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }).then(res => res.data),
};
