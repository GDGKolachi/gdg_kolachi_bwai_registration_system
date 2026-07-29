// Admin roles — these strings are the contract with the backend.
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORGANIZER: 'organizer',
  VOLUNTEER: 'volunteer',
};

export const ALL_ROLES = [ROLES.SUPER_ADMIN, ROLES.ORGANIZER, ROLES.VOLUNTEER];

// Roles allowed into the organising side of the panel (everything except
// admin accounts, which are super-admin only).
export const MANAGEMENT_ROLES = [ROLES.SUPER_ADMIN, ROLES.ORGANIZER];

// Check-in screens are open to every signed-in admin, volunteers included.
export const CHECKIN_ROLES = ALL_ROLES;

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ORGANIZER]: 'Organizer',
  [ROLES.VOLUNTEER]: 'Volunteer',
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: 'Full access, including creating and editing admin accounts.',
  [ROLES.ORGANIZER]: 'Everything except admin accounts — events, registrations, exceptions, teams and check-in.',
  [ROLES.VOLUNTEER]: 'Check-in only — desk check-in, hackathon check-in, QR scan and mobile check-in.',
};

export const ROLE_BADGE_CLASSES = {
  [ROLES.SUPER_ADMIN]: 'bg-violet-50 text-violet-900 ring-1 ring-violet-200/70',
  [ROLES.ORGANIZER]: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  [ROLES.VOLUNTEER]: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
};

export const ROLE_OPTIONS = ALL_ROLES.map(value => ({
  value,
  label: ROLE_LABELS[value],
  description: ROLE_DESCRIPTIONS[value],
}));

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role ?? '—';
}

export function roleBadgeClass(role) {
  return ROLE_BADGE_CLASSES[role] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80';
}

// Volunteers only ever see check-in screens, so that is their landing page.
// Everyone else lands on the dashboard.
export function homePathForRole(role) {
  return role === ROLES.VOLUNTEER ? '/admin/checkin' : '/admin';
}
