/**
 * Single source of truth for hackathon-specific option lists.
 *
 * These are mirrored on the frontend in
 * `frontend/src/features/registration/registration-constants.js` — keep the two
 * in sync when editing.
 */

export const HACKATHON_DOMAINS = [
  'Service & Software Solutions',
  'Fintech & Digital Economy',
  'Healthcare, EdTech & Skill Development',
  'Logistics, Retail & E-commerce',
  'Infrastructure, Smart City & Government Systems',
  'Water, Energy & Waste Management',
  'Social Impact, Accessibility & Inclusion',
  'Environment & Climate Change Solutions',
  'Cybersecurity & Digital Safety',
  'AI, Automation & Emerging Technologies',
  'SME & Startup Enablement',
];

export const HACKATHON_ROLES = [
  'Student',
  'Web Developer',
  'Mobile App Developer',
  'Software Developer',
  'Full Stack Developer',
  'Game Developer',
  'Other Developer',
  'UI/UX Designer',
  'Product Designer',
  'Game Designer',
  'Other Designer',
  'SQA Engineer/Tester',
  'Product and Marketing',
  'Freelancer',
  'Others',
];

export const DEFAULT_ROLES = [
  'Student',
  'Young Professional',
  'Intermediate Expert',
  'Senior Expert',
  'Freelancer',
  'Other',
];

// ── Shortlisting questions ────────────────────────────────────────────────

export const YEARS_EXPERIENCE_OPTIONS = [
  'Less than 1 year',
  '1-2 years',
  '3-5 years',
  '5+ years',
];

export const PRIOR_HACKATHON_OPTIONS = [
  'None - this is my first',
  '1-2',
  '3-5',
  '6+',
];

export const SKILL_OPTIONS = [
  'Frontend',
  'Backend',
  'Mobile',
  'AI/ML',
  'Data & Analytics',
  'Cloud/DevOps',
  'Cybersecurity',
  'UI/UX Design',
  'Product/Business',
  'Game Dev',
  'Hardware/IoT',
  'QA/Testing',
];

export const MAX_SKILLS = 5;

export const AI_EXPERIENCE_OPTIONS = [
  'No',
  'Experimented / tutorials',
  'Yes, shipped to real users',
];

export const WORKED_TOGETHER_OPTIONS = [
  'Never',
  'Once or twice',
  'We work together regularly',
];

// ── Field length caps (mirrored in frontend validation) ───────────────────

export const MAX_BEST_PROJECT_LENGTH = 600;
export const MAX_IDEA_DESCRIPTION_LENGTH = 1000;
export const MAX_MOTIVATION_LENGTH = 2000;

// ── Registration modes ────────────────────────────────────────────────────

export const REGISTRATION_MODE = {
  INDIVIDUAL: 'individual',
  TEAM: 'team',
} as const;

export const TEAM_ORIGIN = {
  AUTO: 'auto',
  SELF_REGISTERED: 'self_registered',
} as const;
