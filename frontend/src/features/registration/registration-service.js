import {
  DEFAULT_ROLE_OPTIONS,
  HACKATHON_DOMAIN_OPTIONS,
  HACKATHON_ROLE_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
  PRIOR_HACKATHON_OPTIONS,
  SKILL_OPTIONS,
  MAX_SKILLS,
  AI_EXPERIENCE_OPTIONS,
  MAX_BEST_PROJECT_LENGTH,
  MAX_MOTIVATION_LENGTH,
} from './registration-constants';

const PHONE_REGEX = /^(03\d{9}|\+923\d{9})$/;
const CNIC_REGEX = /^\d{13}$/;
const URL_REGEX = /^https?:\/\/[^\s.]+\.[^\s]+$/i;

// Skills are asked of every hackathon participant — individual, captain and member.
export function validateSkills(skills) {
  const picked = Array.isArray(skills) ? skills : [];
  if (picked.length === 0) return 'Please select at least one skill';
  if (picked.length > MAX_SKILLS) return `Please select at most ${MAX_SKILLS} skills`;
  if (picked.some((s) => !SKILL_OPTIONS.includes(s))) return 'Please select valid skills';
  return null;
}

// The shortlisting block asked of individuals and team captains (not of members).
export function validateExperienceFields(data) {
  const errors = {};

  if (!data.yearsExperience) errors.yearsExperience = 'Please select your years of experience';
  else if (!YEARS_EXPERIENCE_OPTIONS.includes(data.yearsExperience)) {
    errors.yearsExperience = 'Please choose a valid option';
  }

  if (!data.priorHackathons) errors.priorHackathons = 'Please tell us how many hackathons you have joined';
  else if (!PRIOR_HACKATHON_OPTIONS.includes(data.priorHackathons)) {
    errors.priorHackathons = 'Please choose a valid option';
  }

  if (data.aiExperience && !AI_EXPERIENCE_OPTIONS.includes(data.aiExperience)) {
    errors.aiExperience = 'Please choose a valid option';
  }

  if (data.portfolioUrl?.trim() && !URL_REGEX.test(data.portfolioUrl.trim())) {
    errors.portfolioUrl = 'Enter a valid URL starting with http:// or https://';
  }

  if (!data.bestProject?.trim()) errors.bestProject = 'Please tell us about the best thing you have built';
  else if (data.bestProject.trim().length > MAX_BEST_PROJECT_LENGTH) {
    errors.bestProject = `Please keep your response under ${MAX_BEST_PROJECT_LENGTH} characters`;
  }

  return errors;
}

export function validateRegistrationForm(data, eventTypeSlug, event) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Full name is required';
  if (!data.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email format';
  if (!data.phone?.trim()) errors.phone = 'Phone number is required';
  else {
    const digits = data.phone.replace(/[\s\-()]/g, '');
    if (!PHONE_REGEX.test(digits)) errors.phone = 'Enter a valid Pakistani phone number (e.g. 03XX-XXXXXXX)';
  }
  if (!data.universityOrg?.trim()) errors.universityOrg = 'Organization is required';
  if (!data.linkedin?.trim()) errors.linkedin = 'LinkedIn profile is required';
  if (!data.cnic?.trim()) errors.cnic = 'CNIC/National ID is required';
  else {
    const cnicDigits = data.cnic.replace(/[\s-]/g, '');
    if (!CNIC_REGEX.test(cnicDigits)) errors.cnic = 'CNIC must be exactly 13 digits (e.g. XXXXX-XXXXXXX-X)';
  }
  if (!data.gender) errors.gender = 'Gender is required';

  if (!data.bestDescribesYou) {
    errors.bestDescribesYou = 'This field is required';
  } else {
    const allowed = eventTypeSlug === 'hackathon' ? HACKATHON_ROLE_OPTIONS : DEFAULT_ROLE_OPTIONS;
    if (!allowed.includes(data.bestDescribesYou)) {
      errors.bestDescribesYou = 'Please choose a valid option';
    }
  }

  if (eventTypeSlug === 'hackathon') {
    if (!data.domain) errors.domain = 'Please select a domain';
    else if (!HACKATHON_DOMAIN_OPTIONS.includes(data.domain)) errors.domain = 'Please select a valid domain';
    Object.assign(errors, validateExperienceFields(data));
    const skillsError = validateSkills(data.skills);
    if (skillsError) errors.skills = skillsError;
    if (!data.motivation?.trim()) errors.motivation = 'Please describe how you will contribute';
    else if (data.motivation.trim().length > MAX_MOTIVATION_LENGTH) {
      errors.motivation = `Please keep your response under ${MAX_MOTIVATION_LENGTH} characters`;
    }
  } else if (eventTypeSlug === 'community-lounge') {
    if (!data.track) errors.track = 'Please select a track';
    else if (event?.tracks && !event.tracks.includes(data.track)) errors.track = 'Please select a valid track';
    if (!data.slot) errors.slot = 'Please select a slot';
    else if (event?.slots && !event.slots.includes(data.slot)) errors.slot = 'Please select a valid slot';
  } else {
    if (!data.motivation?.trim()) errors.motivation = 'Motivation is required';
    else if (data.motivation.trim().length > MAX_MOTIVATION_LENGTH) {
      errors.motivation = `Please keep your response under ${MAX_MOTIVATION_LENGTH} characters`;
    }
  }

  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
