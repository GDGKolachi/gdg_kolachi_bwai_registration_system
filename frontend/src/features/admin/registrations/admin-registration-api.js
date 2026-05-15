import api from '../../../axios-instance';

export const adminRegistrationApi = {
  getByWorkshop: (workshopId, params = {}) => {
    const query = new URLSearchParams({ workshop_id: workshopId });
    if (params.name) query.set('name', params.name);
    if (params.email) query.set('email', params.email);
    if (params.phone) query.set('phone', params.phone);
    if (params.cnic) query.set('cnic', params.cnic);
    if (params.status) query.set('status', params.status);
    if (params.defines_you_best) query.set('defines_you_best', params.defines_you_best);
    if (params.gender) query.set('gender', params.gender);
    if (params.university_org) query.set('university_org', params.university_org);
    if (params.checked_in !== undefined) query.set('checked_in', String(params.checked_in));
    if (params.acknowledged !== undefined) query.set('acknowledged', String(params.acknowledged));
    if (params.date_from) query.set('date_from', params.date_from);
    if (params.date_to) query.set('date_to', params.date_to);
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_order) query.set('sort_order', params.sort_order);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return api.get(`/admin/registrations?${query.toString()}`).then(res => res.data);
  },
  exportCsv: (workshopId) => api.get(`/admin/registrations/export?workshop_id=${workshopId}`, { responseType: 'blob' }).then(res => res.data),
  // Unified status update — accepts one or more IDs via POST /registrations/status
  updateStatus: (ids, status) => api.patch('/admin/registrations/status', {
    ids: Array.isArray(ids) ? ids : [ids],
    status,
  }).then(res => res.data),
  // Re-send entry pass + custom note to shortlisted/confirmed registrations
  sendReminder: (ids, message) => api.post('/admin/registrations/reminder', {
    ids: Array.isArray(ids) ? ids : [ids],
    message: message || '',
  }).then(res => res.data),
};
