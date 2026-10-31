import api from '../../axios-instance';

/**
 * Attendee-facing online-session endpoints. Authorised by the signed token in
 * the attendee's personal join link; nothing here requires a login.
 */
export const onlineJoinApi = {
  get: (token) => api.get(`/public/online/${encodeURIComponent(token)}`).then((res) => res.data),
  checkin: (token) => api.post(`/public/online/${encodeURIComponent(token)}/checkin`).then((res) => res.data),
};
