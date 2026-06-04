/** Mirrors RegistrationStatus enum in backend/src/common/enums/registration-status.enum.ts */
export const RegistrationStatus = Object.freeze({
  PENDING:     'pending',
  CONFIRMED:   'confirmed',
  SHORTLISTED: 'shortlisted',
  REJECTED:    'rejected',
  ATTENDED:    'attended',
});

export const ALL_STATUSES = Object.values(RegistrationStatus);

export const STATUS_LABELS = {
  [RegistrationStatus.PENDING]:     'Pending',
  [RegistrationStatus.CONFIRMED]:   'Confirmed',
  [RegistrationStatus.SHORTLISTED]: 'Shortlisted',
  [RegistrationStatus.REJECTED]:    'Rejected',
  [RegistrationStatus.ATTENDED]:    'Attended',
};

export const STATUS_COLORS = {
  [RegistrationStatus.PENDING]:     'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
  [RegistrationStatus.CONFIRMED]:   'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  [RegistrationStatus.SHORTLISTED]: 'bg-violet-50 text-violet-900 ring-1 ring-violet-200/70',
  [RegistrationStatus.REJECTED]:    'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
  [RegistrationStatus.ATTENDED]:    'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
};

export const STATUS_BUTTON_COLORS = {
  [RegistrationStatus.PENDING]:     'bg-slate-200 text-slate-800 hover:bg-slate-300',
  [RegistrationStatus.CONFIRMED]:   'bg-gdg-blue text-white shadow-sm shadow-blue-500/25 hover:bg-blue-600',
  [RegistrationStatus.SHORTLISTED]: 'bg-violet-600 text-white shadow-sm shadow-violet-500/25 hover:bg-violet-700',
  [RegistrationStatus.REJECTED]:    'bg-gdg-red text-white shadow-sm shadow-red-500/20 hover:bg-red-600',
  [RegistrationStatus.ATTENDED]:    'bg-gdg-green text-white shadow-sm shadow-emerald-500/20 hover:bg-green-600',
};

/** Valid status transitions (state machine) */
export const VALID_TRANSITIONS = {
  [RegistrationStatus.PENDING]:     [RegistrationStatus.SHORTLISTED, RegistrationStatus.CONFIRMED, RegistrationStatus.REJECTED],
  [RegistrationStatus.SHORTLISTED]: [RegistrationStatus.CONFIRMED, RegistrationStatus.REJECTED],
  [RegistrationStatus.CONFIRMED]:   [RegistrationStatus.ATTENDED, RegistrationStatus.SHORTLISTED, RegistrationStatus.REJECTED],
  [RegistrationStatus.REJECTED]:    [RegistrationStatus.PENDING],
  [RegistrationStatus.ATTENDED]:    [],
};

/** All statuses shown in the bulk-action bar */
export const BULK_STATUSES = [
  RegistrationStatus.PENDING,
  RegistrationStatus.SHORTLISTED,
  RegistrationStatus.CONFIRMED,
  RegistrationStatus.REJECTED,
  RegistrationStatus.ATTENDED,
];

/** Options for the Status filter dropdown */
export const STATUS_FILTER_OPTIONS = ALL_STATUSES.map(value => ({
  value,
  label: STATUS_LABELS[value],
}));
