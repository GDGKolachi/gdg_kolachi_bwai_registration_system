import api from '../../../axios-instance';

export const checkinApi = {
  search: (eventId, query) =>
    api
      .get(`/admin/checkin/search?event_id=${eventId}&q=${encodeURIComponent(query)}`)
      .then((res) => res.data),
  getAll: (eventId) =>
    api.get(`/admin/checkin/search?event_id=${eventId}&q=`).then((res) => res.data),
  setCheckin: ({ id, checkedIn }) =>
    api.patch(`/admin/checkin/${id}/toggle`, { checked_in: checkedIn }).then((res) => res.data),
};
