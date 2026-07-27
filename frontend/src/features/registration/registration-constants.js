// Centralised constants for the dynamic registration form.

export const DEFAULT_ROLE_OPTIONS = [
  'Student',
  'Young Professional',
  'Intermediate Expert',
  'Senior Expert',
  'Freelancer',
  'Other',
];

export const HACKATHON_ROLE_OPTIONS = [
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

export const HACKATHON_DOMAIN_OPTIONS = [
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

// ── Shortlisting questions ────────────────────────────────────────────────
// Mirrors backend/src/common/constants/hackathon.constants.ts — keep in sync.

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
 * Skills replace the "what best describes you" dropdown for hackathons.
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

export const SKILL_OPTIONS = SKILL_GROUPS.flatMap(g => g.skills);

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

export const MAX_BEST_PROJECT_LENGTH = 600;
export const MAX_IDEA_DESCRIPTION_LENGTH = 1000;
export const MAX_MOTIVATION_LENGTH = 2000;

export const REGISTRATION_MODE = {
  INDIVIDUAL: 'individual',
  TEAM: 'team',
};

export function rolesForEventType(slug) {
  return slug === 'hackathon' ? HACKATHON_ROLE_OPTIONS : DEFAULT_ROLE_OPTIONS;
}

export function motivationLabelFor(slug) {
  switch (slug) {
    case 'hackathon':
      return 'How will you contribute to solving problems in the Hackathon? *';
    case 'talks':
      return 'Why do you want to attend this talk? *';
    case 'community-lounge':
      return null;
    default:
      return 'Why do you want to attend this workshop? *';
  }
}

export function motivationPlaceholderFor(slug) {
  switch (slug) {
    case 'hackathon':
      return 'Describe the role you will play and the kind of solutions you want to build…';
    case 'talks':
      return 'Tell us what you hope to take away from this talk…';
    default:
      return 'Tell us what motivates you and what you hope to learn…';
  }
}
