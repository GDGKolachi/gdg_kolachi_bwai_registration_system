import api from '../../axios-instance';

export const registrationApi = {
  checkEmail: (email) => api.get(`/registrations/check-email?email=${encodeURIComponent(email)}`).then(res => res.data),
  register: (data) => api.post('/registrations', data).then(res => res.data),
};
