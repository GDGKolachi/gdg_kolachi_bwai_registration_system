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

/**
 * Skills replace the old "what best describes you" dropdown for hackathons.
 * Grouped so the form reads as three equal tracks rather than a wall of
 * engineering options — the hackathon is open to business and domain people,
 * not just developers.
 */
export const SKILL_GROUPS = [
  {
    label: 'Build',
    skills: [
      'Frontend',
      'Backend',
      'Mobile',
      'AI/ML',
      'Data & Analytics',
      'Cloud/DevOps',
      'Cybersecurity',
      'Game Dev',
      'Hardware/IoT',
      'QA/Testing',
    ],
  },
  {
    label: 'Design',
    skills: ['UI/UX Design', 'Product Design', 'Graphic & Visual Design'],
  },
  {
    label: 'Business & Domain',
    skills: [
      'Product/Business',
      'Marketing & Growth',
      'Research & Domain Expertise',
      'Content & Storytelling',
      'Project Management',
      'Finance & Operations',
      'Policy, Legal & Compliance',
      'Community & Partnerships',
    ],
  },
];

export const SKILL_OPTIONS = SKILL_GROUPS.flatMap((g) => g.skills);

export const MAX_SKILLS = 5;

/**
 * Primary skill → team-formation bucket. The attendee's chosen primary skill is
 * stored in `attendees.best_describes_you`, so the existing role_categories
 * lookup and the whole assignment engine keep working unchanged.
 *
 * TeamAssignmentService.roleGroup() collapses these into three target groups:
 * developer | designer (designer + product_designer) | other (everything else).
 */
export const SKILL_BUCKETS: Record<string, string> = {
  Frontend: 'developer',
  Backend: 'developer',
  Mobile: 'developer',
  'AI/ML': 'developer',
  'Data & Analytics': 'developer',
  'Cloud/DevOps': 'developer',
  Cybersecurity: 'developer',
  'Game Dev': 'developer',
  'Hardware/IoT': 'developer',
  'QA/Testing': 'qa',
  'UI/UX Design': 'designer',
  'Product Design': 'product_designer',
  'Graphic & Visual Design': 'designer',
  'Product/Business': 'sales',
  'Marketing & Growth': 'sales',
  'Research & Domain Expertise': 'other',
  'Content & Storytelling': 'other',
  'Project Management': 'other',
  'Finance & Operations': 'other',
  'Policy, Legal & Compliance': 'other',
  'Community & Partnerships': 'other',
};

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
