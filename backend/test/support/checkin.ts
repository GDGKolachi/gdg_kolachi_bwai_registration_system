import { Http } from './backend';
import { Person, SeededEvent, SeededTeam } from './event-day';

export function deskSearch(client: Http, event: SeededEvent, query = '') {
  return client.get(
    `/admin/checkin/search?event_id=${event.id}&q=${encodeURIComponent(query)}`,
  );
}

export async function deskRowOf(
  client: Http,
  event: SeededEvent,
  person: Person,
) {
  const res = await deskSearch(client, event);
  return (res.body as any[]).find((row) => row.id === person.registrationId);
}

export function deskCheckIn(
  client: Http,
  person: Person,
  body?: { checked_in: boolean },
) {
  return client.send(
    'patch',
    `/admin/checkin/${person.registrationId}/toggle`,
    body,
  );
}

export async function checkedInCount(
  client: Http,
  event: SeededEvent,
): Promise<number> {
  const res = await client.get(`/admin/checkin-stats/${event.id}`);
  return res.body.checkedIn;
}

export function scanQr(client: Http, person: Person) {
  return client.post('/admin/qr-scan', { qr_data: person.qrCode });
}

export function markAttended(client: Http, person: Person) {
  return client.patch(`/admin/qr-scan/${person.registrationId}/attend`);
}

export function hackathonCheckIn(client: Http, person: Person) {
  return client.post(`/admin/hackathon-checkin/${person.registrationId}`);
}

export function undoHackathonCheckIn(client: Http, person: Person) {
  return client.post(
    `/admin/hackathon-checkin/${person.registrationId}/unassign`,
  );
}

export function teamList(client: Http, event: SeededEvent) {
  return client.get(`/admin/events/${event.id}/teams`);
}

export async function teamNumberOf(
  client: Http,
  event: SeededEvent,
  person: Person,
) {
  const res = await teamList(client, event);
  const team = (res.body as any[]).find((t) =>
    (t.members ?? []).some(
      (m: any) => m.registration_id === person.registrationId,
    ),
  );
  return team?.team_number ?? null;
}

export function memberIdsOf(teamRow: any): string[] {
  return (teamRow.members ?? []).map((m: any) => m.registration_id).sort();
}

export function idsOf(team: SeededTeam): string[] {
  return team.members.map((m) => m.registrationId).sort();
}
