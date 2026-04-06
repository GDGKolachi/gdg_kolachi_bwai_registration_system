import api from '../../../axios-instance';

export const checkinApi = {
  search: (workshopId, query) =>
    api.get(`/admin/checkin/search?workshop_id=${workshopId}&q=${encodeURIComponent(query)}`).then(res => res.data),
  getAll: (workshopId) =>
    api.get(`/admin/checkin/search?workshop_id=${workshopId}&q=`).then(res => res.data),
  toggleCheckin: (registrationId) =>
    api.patch(`/admin/checkin/${registrationId}/toggle`).then(res => res.data),
};
