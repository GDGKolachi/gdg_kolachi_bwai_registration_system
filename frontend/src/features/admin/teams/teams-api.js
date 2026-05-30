import api from '../../../axios-instance';

export const teamsApi = {
  list: (eventId) => api.get(`/admin/events/${eventId}/teams`).then(res => res.data),
  getConfig: (eventId) => api.get(`/admin/events/${eventId}/team-formation-config`).then(res => res.data),
  updateConfig: (eventId, data) =>
    api.patch(`/admin/events/${eventId}/team-formation-config`, data).then(res => res.data),
  optimize: (eventId) =>
    api.post(`/admin/events/${eventId}/teams/optimize`, {}).then(res => res.data),
  lock: (eventId) =>
    api.post(`/admin/events/${eventId}/teams/lock`, {}).then(res => res.data),
  unlockTeam: (teamId) => api.post(`/admin/teams/${teamId}/unlock`, {}).then(res => res.data),
  moveMember: (teamId, registrationId) =>
    api.patch(`/admin/teams/${teamId}/members/${registrationId}/move`, {}).then(res => res.data),
  hackathonCheckin: (registrationId) =>
    api.post(`/admin/hackathon-checkin/${registrationId}`, {}).then(res => res.data),
  hackathonUnassign: (registrationId) =>
    api.post(`/admin/hackathon-checkin/${registrationId}/unassign`, {}).then(res => res.data),
};
