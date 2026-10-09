import api from '../../../axios-instance';

export const creditsApi = {
  getForRegistration: (registrationId) =>
    api.get(`/admin/credits/registrations/${registrationId}`).then((res) => res.data),
  send: (registrationId) =>
    api.post(`/admin/credits/registrations/${registrationId}/send`).then((res) => res.data),
  getQr: (registrationId) =>
    api.get(`/admin/credits/registrations/${registrationId}/qr`).then((res) => res.data),
  confirm: (registrationId) =>
    api.post(`/admin/credits/registrations/${registrationId}/confirm`).then((res) => res.data),
  unconfirm: (registrationId) =>
    api.delete(`/admin/credits/registrations/${registrationId}/confirm`).then((res) => res.data),
  summary: (eventId) =>
    api.get(`/admin/credits/events/${eventId}/summary`).then((res) => res.data),
  followUp: (eventId, filter) =>
    api
      .get(`/admin/credits/events/${eventId}/follow-up`, { params: { filter } })
      .then((res) => res.data),
  sendBulk: (eventId) =>
    api.post('/admin/credits/send-bulk', { event_id: eventId }).then((res) => res.data),
  resendQr: (eventId) =>
    api.get(`/admin/credits/events/${eventId}/resend-qr`).then((res) => res.data),
};
