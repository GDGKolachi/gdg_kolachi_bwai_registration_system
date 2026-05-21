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
  'Software Sales Executive',
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
