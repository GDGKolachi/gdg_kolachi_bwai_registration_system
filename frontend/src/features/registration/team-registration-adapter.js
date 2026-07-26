function prepareMemberPayload(member, isCaptain) {
  const payload = {
    name: member.name?.trim(),
    email: member.email?.trim(),
    phone: member.phone?.trim(),
    university_org: member.universityOrg?.trim(),
    linkedin: member.linkedin?.trim(),
    cnic: member.cnic?.trim(),
    gender: member.gender,
    best_describes_you: member.bestDescribesYou,
    skills: member.skills || [],
    is_captain: isCaptain,
  };
  if (member.github?.trim()) payload.github = member.github.trim();

  // Everything below is captain-only — members are never asked these questions.
  if (!isCaptain) return payload;

  if (member.yearsExperience) payload.years_experience = member.yearsExperience;
  if (member.priorHackathons) payload.prior_hackathons = member.priorHackathons;
  if (member.aiExperience) payload.ai_experience = member.aiExperience;
  if (member.portfolioUrl?.trim()) payload.portfolio_url = member.portfolioUrl.trim();
  if (member.bestProject?.trim()) payload.best_project = member.bestProject.trim();
  if (member.motivation?.trim()) payload.motivation = member.motivation.trim();
  if (member.ambassador?.trim()) payload.ambassador = member.ambassador.trim();
  return payload;
}

export function prepareTeamRegistrationPayload(state) {
  const team = state.team || {};
  const hasIdea = team.hasIdea === true;

  const teamPayload = {
    name: team.name?.trim(),
    primary_domain: team.domain,
    has_idea: hasIdea,
    worked_together_before: team.workedTogether,
  };
  if (hasIdea && team.ideaDescription?.trim()) {
    teamPayload.idea_description = team.ideaDescription.trim();
  }

  return {
    event_id: state.eventId,
    team: teamPayload,
    members: (state.members || []).map((member, index) => prepareMemberPayload(member, index === 0)),
  };
}
