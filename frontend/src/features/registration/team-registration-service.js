import { validateRegistrationForm } from './registration-service';
import {
  HACKATHON_DOMAIN_OPTIONS,
  WORKED_TOGETHER_OPTIONS,
  MAX_IDEA_DESCRIPTION_LENGTH,
} from './registration-constants';

// Asked once for the whole team, so it never belongs to a member.
const TEAM_LEVEL_KEYS = ['domain'];

// Only the captain answers the shortlisting block.
const CAPTAIN_ONLY_KEYS = [
  'yearsExperience',
  'priorHackathons',
  'aiExperience',
  'portfolioUrl',
  'bestProject',
  'motivation',
];

function validateMember(member, isCaptain) {
  // Reuse the single-registration rules (identity regexes, roles, skills, captain block).
  const errors = validateRegistrationForm(member, 'hackathon');
  TEAM_LEVEL_KEYS.forEach((key) => delete errors[key]);
  if (!isCaptain) CAPTAIN_ONLY_KEYS.forEach((key) => delete errors[key]);
  return errors;
}

function validateTeamDetails(team) {
  const errors = {};

  if (!team.name?.trim()) errors.name = 'Team name is required';
  else if (team.name.trim().length < 2) errors.name = 'Team name is too short';

  if (!team.domain) errors.domain = 'Please select a domain';
  else if (!HACKATHON_DOMAIN_OPTIONS.includes(team.domain)) errors.domain = 'Please select a valid domain';

  if (team.hasIdea !== true && team.hasIdea !== false) {
    errors.hasIdea = 'Please tell us whether your team already has an idea';
  } else if (team.hasIdea === true) {
    if (!team.ideaDescription?.trim()) errors.ideaDescription = 'Please describe your idea';
    else if (team.ideaDescription.trim().length > MAX_IDEA_DESCRIPTION_LENGTH) {
      errors.ideaDescription = `Please keep your response under ${MAX_IDEA_DESCRIPTION_LENGTH} characters`;
    }
  }

  if (!team.workedTogether) errors.workedTogether = 'Please select an option';
  else if (!WORKED_TOGETHER_OPTIONS.includes(team.workedTogether)) {
    errors.workedTogether = 'Please choose a valid option';
  }

  return errors;
}

export function validateTeamRegistration(state, eventConfig) {
  // Accepts either the adapted event or its teamConfig directly.
  const config = eventConfig?.teamConfig || eventConfig || {};
  const members = state.members || [];
  const teamErrors = validateTeamDetails(state.team || {});
  const memberErrors = members.map((member, index) => validateMember(member, index === 0));

  // Flag the later occurrence of a duplicate email.
  const seen = new Map();
  members.forEach((member, index) => {
    const email = member.email?.trim().toLowerCase();
    if (!email) return;
    if (seen.has(email)) {
      memberErrors[index].email = `This email is already used by ${seen.get(email)}`;
    } else {
      seen.set(email, index === 0 ? 'the team captain' : `member ${index + 1}`);
    }
  });

  if (config.minTeamSize && members.length < config.minTeamSize) {
    teamErrors.members = `A team needs at least ${config.minTeamSize} members`;
  } else if (config.maxTeamSize && members.length > config.maxTeamSize) {
    teamErrors.members = `A team can have at most ${config.maxTeamSize} members`;
  }

  return { team: teamErrors, members: memberErrors };
}

export function hasTeamErrors(errors) {
  if (!errors) return false;
  if (Object.keys(errors.team || {}).length > 0) return true;
  return (errors.members || []).some((member) => Object.keys(member || {}).length > 0);
}
