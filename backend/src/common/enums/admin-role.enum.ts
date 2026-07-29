export enum AdminRole {
  /** Everything, including managing admin users. */
  SUPER_ADMIN = 'super_admin',
  /** Everything except managing admin users. */
  ORGANIZER = 'organizer',
  /** Event-day check-in only — no attendee PII export, no edits. */
  VOLUNTEER = 'volunteer',
}

export const ADMIN_ROLES = Object.values(AdminRole);

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  [AdminRole.SUPER_ADMIN]: 'Super Admin',
  [AdminRole.ORGANIZER]: 'Organizer',
  [AdminRole.VOLUNTEER]: 'Volunteer',
};

/** Roles allowed to reach the day-of check-in surfaces. */
export const CHECKIN_ROLES = [AdminRole.SUPER_ADMIN, AdminRole.ORGANIZER, AdminRole.VOLUNTEER];

/** Roles allowed to manage events, registrations and attendee data. */
export const ORGANIZER_ROLES = [AdminRole.SUPER_ADMIN, AdminRole.ORGANIZER];
