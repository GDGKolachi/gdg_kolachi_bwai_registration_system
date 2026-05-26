import api from '../../../axios-instance';

export const checkinApi = {
  search: (eventId, query) =>
    api
      .get(`/admin/checkin/search?event_id=${eventId}&q=${encodeURIComponent(query)}`)
      .then((res) => res.data),
  getAll: (eventId) =>
    api.get(`/admin/checkin/search?event_id=${eventId}&q=`).then((res) => res.data),
  toggleCheckin: (registrationId) =>
    api.patch(`/admin/checkin/${registrationId}/toggle`).then((res) => res.data),
};
