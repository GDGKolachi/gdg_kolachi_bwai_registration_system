import api from '../../axios-instance';

/**
 * Attendee-facing credits endpoints. The confirm page is authorised by the
 * unguessable token in the email link; nothing here requires a login.
 */
export const creditsPublicApi = {
  get: (token) => api.get(`/public/credits/${encodeURIComponent(token)}`).then((res) => res.data),
  redeem: (token) => api.post(`/public/credits/${encodeURIComponent(token)}/redeem`).then((res) => res.data),
  resend: (body) => api.post('/public/credits/resend', body).then((res) => res.data),
};
