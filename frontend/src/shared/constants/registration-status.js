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
  [RegistrationStatus.PENDING]:     'bg-yellow-100 text-amber-600',
  [RegistrationStatus.CONFIRMED]:   'bg-blue-100 text-gdg-blue',
  [RegistrationStatus.SHORTLISTED]: 'bg-purple-100 text-purple-700',
  [RegistrationStatus.REJECTED]:    'bg-red-100 text-gdg-red',
  [RegistrationStatus.ATTENDED]:    'bg-green-100 text-gdg-green',
};

export const STATUS_BUTTON_COLORS = {
  [RegistrationStatus.PENDING]:     'bg-gray-200 text-gray-700 hover:bg-gray-300',
  [RegistrationStatus.CONFIRMED]:   'bg-gdg-blue text-white hover:bg-blue-600',
  [RegistrationStatus.SHORTLISTED]: 'bg-purple-600 text-white hover:bg-purple-700',
  [RegistrationStatus.REJECTED]:    'bg-gdg-red text-white hover:bg-red-600',
  [RegistrationStatus.ATTENDED]:    'bg-gdg-green text-white hover:bg-green-600',
};

/** All statuses shown in the bulk-action bar */
export const BULK_STATUSES = ALL_STATUSES;

/** Options for the Status filter dropdown */
export const STATUS_FILTER_OPTIONS = ALL_STATUSES.map(value => ({
  value,
  label: STATUS_LABELS[value],
}));
