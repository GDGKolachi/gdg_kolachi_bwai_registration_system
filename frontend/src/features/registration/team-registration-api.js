import api from '../../axios-instance';

export const teamRegistrationApi = {
  register: (payload) => api.post('/registrations/team', payload).then(res => res.data),
};
