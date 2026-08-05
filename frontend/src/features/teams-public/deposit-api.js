import api from '../../axios-instance';

/**
 * The deposit page is reached from the request email and authorised by knowing
 * the team's UUID — the same shape as the acknowledgement link. Nothing here
 * requires a login.
 */
export const depositApi = {
  get: (teamId) => api.get(`/public/teams/${teamId}/deposit`).then((res) => res.data),
  submit: (teamId, body) => api.post(`/public/teams/${teamId}/deposit`, body).then((res) => res.data),
};
