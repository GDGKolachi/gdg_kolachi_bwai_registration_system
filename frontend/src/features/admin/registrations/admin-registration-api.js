import api from '../../../axios-instance';

export const adminRegistrationApi = {
  getByWorkshop: (workshopId) => api.get(`/admin/registrations?workshop_id=${workshopId}`).then(res => res.data),
  exportCsv: (workshopId) => api.get(`/admin/registrations/export?workshop_id=${workshopId}`, { responseType: 'blob' }).then(res => res.data),
};
