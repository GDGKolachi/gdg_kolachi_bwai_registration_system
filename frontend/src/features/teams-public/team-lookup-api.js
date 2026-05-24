import api from '../../axios-instance';

export const teamLookupApi = {
  lookup: (eventId, email, name) => {
    const query = new URLSearchParams({ email, name });
    return api.get(`/events/${eventId}/team-lookup?${query.toString()}`).then((res) => res.data);
  },
};
