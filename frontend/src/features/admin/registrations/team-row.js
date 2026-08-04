/**
 * Everything the teams grid needs about one team, derived once from the
 * `/admin/events/:id/teams` payload so the row markup stays declarative.
 *
 * `members` there are TeamMember rows with the registration nested, which is a
 * different shape from the flattened roster the detail drawer fetches — hence
 * the unwrapping here rather than in a shared helper.
 */
export function toTeamRow(team) {
  const memberships = (team.members || []).filter(m => m.registration);
  const live = memberships.filter(m => !m.registration.deleted_at);

  const captainship =
    memberships.find(m => m.registration.id === team.captain_registration_id) ||
    memberships.find(m => m.registration.is_captain) ||
    null;
  const captain = captainship?.registration || null;

  const registrations = memberships.map(m => m.registration);
  const registeredAt = registrations
    .map(r => r.registered_at)
    .filter(Boolean)
    .sort()[0] || null;

  return {
    team,
    id: team.id,
    teamNumber: team.team_number,
    name: team.name,
    label: [team.team_number != null ? `#${team.team_number}` : null, team.name].filter(Boolean).join(' · '),
    origin: team.origin,
    captain,
    captainName: captain?.attendee?.name || null,
    // The captain's org is the useful one — it is who the team registered under.
    org: captain?.attendee?.university_org
      || registrations.find(r => r.attendee?.university_org)?.attendee?.university_org
      || null,
    domain: team.primary_domain || captain?.domain || registrations.find(r => r.domain)?.domain || null,
    memberships,
    registrations,
    memberIds: live.map(m => m.registration.id),
    memberCount: live.length,
    statusCounts: team.status_counts || {},
    belowMinimum: !!team.below_minimum,
    lockedAt: team.locked_at,
    registeredAt,
  };
}
