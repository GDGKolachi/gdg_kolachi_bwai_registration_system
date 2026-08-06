import api from '../../../axios-instance';

export const adminRegistrationApi = {
  getByEvent: (eventId, params = {}) => {
    const query = new URLSearchParams({ event_id: eventId });
    if (params.name) query.set('name', params.name);
    if (params.email) query.set('email', params.email);
    if (params.phone) query.set('phone', params.phone);
    if (params.cnic) query.set('cnic', params.cnic);
    if (params.status) query.set('status', params.status);
    if (params.best_describes_you) query.set('best_describes_you', params.best_describes_you);
    if (params.gender) query.set('gender', params.gender);
    if (params.university_org) query.set('university_org', params.university_org);
    if (params.domain) query.set('domain', params.domain);
    if (params.role_bucket) query.set('role_bucket', params.role_bucket);
    if (params.registration_mode) query.set('registration_mode', params.registration_mode);
    if (params.ambassador) query.set('ambassador', params.ambassador);
    if (params.checked_in !== undefined) query.set('checked_in', String(params.checked_in));
    if (params.acknowledged !== undefined) query.set('acknowledged', String(params.acknowledged));
    if (params.date_from) query.set('date_from', params.date_from);
    if (params.date_to) query.set('date_to', params.date_to);
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_order) query.set('sort_order', params.sort_order);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.include_deleted) query.set('include_deleted', 'true');
    return api.get(`/admin/registrations?${query.toString()}`).then((res) => res.data);
},
  exportCsv: (eventId, ids) => {
    const params = new URLSearchParams({ event_id: eventId });
    if (ids && ids.length > 0) params.set('ids', ids.join(','));
    return api.get(`/admin/registrations/export?${params.toString()}`, { responseType: 'blob' }).then((res) => res.data);
  },
  getAmbassadors: (eventId) =>
    api.get(`/admin/registrations/ambassadors?event_id=${eventId}`).then((res) => res.data),
  updateStatus: (ids, status) =>
    api
      .patch('/admin/registrations/status', {
        ids: Array.isArray(ids) ? ids : [ids],
        status,
      })
      .then((res) => res.data),
  // Re-send entry pass + custom note to shortlisted/confirmed registrations
  sendReminder: (ids, message) =>
    api
      .post('/admin/registrations/reminder', {
        ids: Array.isArray(ids) ? ids : [ids],
        message: message || '',
      })
      .then((res) => res.data),
  importCsvStatus: (csv, status) =>
    api
      .post('/admin/registrations/import-status', { csv, status })
      .then((res) => res.data),
  // Soft delete — the row is hidden everywhere and the seat is freed, but it
  // can be brought back with restore().
  softDelete: (id) => api.delete(`/admin/registrations/${id}`).then((res) => res.data),
  restore: (id) => api.post(`/admin/registrations/${id}/restore`).then((res) => res.data),
  // "Your window closed and the spot is gone" — for shortlisted registrations
  // that never confirmed.
  sendAcknowledgementExpired: (ids, message, alsoReject) =>
    api
      .post('/admin/registrations/acknowledgement-expired', {
        ids: Array.isArray(ids) ? ids : [ids],
        message: message || '',
        also_reject: alsoReject,
      })
      .then((res) => res.data),
  sendRejection: (ids, alsoReject) =>
    api
      .post('/admin/registrations/rejection', {
        ids: Array.isArray(ids) ? ids : [ids],
        also_reject: alsoReject,
      })
      .then((res) => res.data),
};

// Backwards-compat alias
adminRegistrationApi.getByWorkshop = adminRegistrationApi.getByEvent;
