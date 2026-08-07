import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminEvents, useLockAcknowledgements, useUnlockAcknowledgements } from '../../event-management/admin-event-repository';
import { useAdminRegistrations, useUpdateRegistrationStatus, useBulkUpdateStatus, useEventAmbassadors, useSendReminder, useSendRejection, useSendAcknowledgementExpired, useSendWhatsappGroup, useImportCsvStatus, useDeleteRegistration, useRestoreRegistration } from '../admin-registration-repository';
import { adminRegistrationApi } from '../admin-registration-api';
import { useCurrentUser } from '../../auth/use-current-user';
import { MANAGEMENT_ROLES } from '../../auth/roles';
import RegistrationDetailDrawer from '../components/registration-detail-drawer';
import TeamsGrid from '../components/teams-grid';
import { toTeamRow } from '../team-row';
import { useTeams, useRequestTeamPayment, useMessageTeams } from '../../teams/teams-repository';
import {
  STATUS_COLORS,
  STATUS_BUTTON_COLORS,
  STATUS_LABELS,
  STATUS_FILTER_OPTIONS,
  BULK_STATUSES,
  ALL_STATUSES,
} from '../../../../shared/constants/registration-status';
import { formatDate } from '../../../../shared/utils/formatDate';
import { linkedinUrl, githubUrl, externalUrl } from '../../../../shared/utils/profileUrl';
import { SKILL_OPTIONS } from '../../../registration/registration-constants';

function ExternalLinkIcon() {
  return (
    <svg className="w-3 h-3 inline-block ml-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

const INITIAL_FILTERS = {
  name: '',
  email: '',
  phone: '',
  cnic: '',
  status: [],
  best_describes_you: [],
  gender: [],
  domain: [],
  ambassador: [],
  registration_mode: '',
  university_org: '',
  checked_in: '',
  acknowledged: '',
  date_from: '',
  date_to: '',
  // '' = live registrations only, 'true' = also show soft-deleted rows
  include_deleted: '',
};

// Hackathon registrants store their primary skill in best_describes_you, so the
// filter offers both — older role values stay filterable.
const PROFILE_OPTIONS = Array.from(new Set([
  'Student',
  'Young Professional',
  'Intermediate Expert',
  'Senior Expert',
  'Freelancer',
  'Other',
  // Hackathon-only roles also visible in this filter
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
  'Others',
  ...SKILL_OPTIONS,
]));

const DOMAIN_OPTIONS = [
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

const GENDER_OPTIONS = ['Male', 'Female', 'Non-Binary', 'Prefer not to say'];

const COLUMN_PREF_KEY  = 'gdg.admin.registrations.hidden-columns.v1';
const DENSITY_PREF_KEY = 'gdg.admin.registrations.density.v1';
const FILTERS_PREF_KEY = 'gdg.admin.registrations.filters-open.v1';
const VIEW_PREF_KEY    = 'gdg.admin.registrations.view-mode.v1';
// The group link is retyped for every send otherwise, and it is long enough
// that retyping it is how the wrong one gets sent. Keyed per event.
const WHATSAPP_PREF_KEY = 'gdg.admin.registrations.whatsapp-link.v1';

function readPref(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private-mode / quota failures are not worth surfacing — prefs are cosmetic.
  }
}

function ProfileLink({ label, url, raw }) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="inline-flex items-center gap-0.5 text-gdg-blue hover:underline"
        title={url}
      >
        {label} <ExternalLinkIcon />
      </a>
    );
  }
  // Value present but unusable as a link — show it so the admin can still fix it.
  return raw ? <span className="text-slate-400" title={`${label}: ${raw}`}>{label}?</span> : null;
}

/**
 * One descriptor per grid column. Driving the header and body from the same
 * list is what makes the column picker (and the sticky/aligned classes)
 * possible without keeping two JSX blocks in sync.
 */
const COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    sticky: true,
    cellClass: 'whitespace-nowrap font-medium text-slate-900',
    render: (r, ctx) => (
      <span className="flex items-baseline gap-2">
        <span className="w-6 shrink-0 text-right text-[0.7rem] tabular-nums text-slate-400">{ctx.rowNumber}</span>
        <span className={`truncate ${r.deleted_at ? 'text-slate-400 line-through' : ''}`}>{r.attendee?.name || '—'}</span>
        {r.deleted_at && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600 ring-1 ring-slate-200/80">
            Deleted
          </span>
        )}
      </span>
    ),
  },
  {
    key: 'team',
    label: 'Team',
    cellClass: 'whitespace-nowrap',
    render: (r, ctx) => (ctx.teamLabel ? (
      <span className="inline-flex items-center gap-1.5">
        <span className="max-w-[140px] truncate" title={ctx.teamLabel}>{ctx.teamLabel}</span>
        {r.is_captain && (
          <span className="shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-indigo-900 ring-1 ring-indigo-200/70">
            Captain
          </span>
        )}
      </span>
    ) : '—'),
  },
  {
    key: 'email',
    label: 'Email',
    cellClass: 'whitespace-nowrap',
    render: r => (r.attendee?.email ? (
      <a
        href={`mailto:${r.attendee.email}`}
        onClick={e => e.stopPropagation()}
        className="text-slate-700 hover:text-gdg-blue hover:underline"
      >
        {r.attendee.email}
      </a>
    ) : '—'),
  },
  { key: 'phone',  label: 'Phone',  cellClass: 'whitespace-nowrap tabular-nums', render: r => r.attendee?.phone || '—' },
  { key: 'cnic',   label: 'CNIC',   cellClass: 'whitespace-nowrap tabular-nums', render: r => r.attendee?.cnic  || '—' },
  { key: 'gender', label: 'Gender', cellClass: 'whitespace-nowrap',              render: r => r.attendee?.gender || '—' },
  {
    key: 'university_org',
    label: 'University / Org',
    cellClass: 'max-w-[160px] truncate',
    cellTitle: r => r.attendee?.university_org,
    render: r => r.attendee?.university_org || '—',
  },
  {
    key: 'profile',
    label: 'Profile / skill',
    defaultHidden: true,
    cellClass: 'max-w-[160px] truncate',
    cellTitle: r => r.attendee?.best_describes_you,
    render: r => r.attendee?.best_describes_you || '—',
  },
  {
    key: 'domain',
    label: 'Domain',
    defaultHidden: true,
    cellClass: 'max-w-[180px] truncate',
    cellTitle: r => r.domain,
    render: r => r.domain || '—',
  },
  {
    key: 'ambassador',
    label: 'Ambassador',
    cellClass: 'max-w-[160px] truncate',
    cellTitle: r => r.ambassador,
    render: r => r.ambassador || '—',
  },
  {
    key: 'links',
    label: 'Links',
    cellClass: 'whitespace-nowrap',
    render: (r, ctx) => (ctx.github || ctx.linkedin || ctx.portfolio || r.attendee?.github || r.attendee?.linkedin ? (
      <span className="inline-flex items-center gap-2">
        <ProfileLink label="GitHub"   url={ctx.github}    raw={r.attendee?.github} />
        <ProfileLink label="LinkedIn" url={ctx.linkedin}  raw={r.attendee?.linkedin} />
        <ProfileLink label="Portfolio" url={ctx.portfolio} raw={null} />
      </span>
    ) : '—'),
  },
  {
    key: 'motivation',
    label: 'Motivation',
    cellClass: 'max-w-[200px]',
    render: r => <span className="block truncate" title={r.motivation}>{r.motivation || '—'}</span>,
  },
  {
    key: 'registered_at',
    label: 'Registered',
    sortable: true,
    cellClass: 'whitespace-nowrap text-gdg-gray',
    render: r => formatDate(r.registered_at),
  },
  {
    key: 'status',
    label: 'Status',
    cellClass: 'whitespace-nowrap',
    render: r => (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'}`}>
        {STATUS_LABELS[r.status] ?? r.status}
      </span>
    ),
  },
  {
    key: 'acknowledged',
    label: 'Ack',
    headerTitle: 'User confirmed via shortlisted email',
    cellClass: 'whitespace-nowrap text-center text-gdg-gray',
    render: r => (r.acknowledged ? '✓' : '—'),
  },
  {
    key: 'checked_in',
    label: 'Checked in',
    defaultHidden: true,
    cellClass: 'whitespace-nowrap text-center text-gdg-gray',
    render: r => (r.checked_in ? '✓' : '—'),
  },
];

const DEFAULT_HIDDEN_COLUMNS = COLUMNS.filter(c => c.defaultHidden).map(c => c.key);

function ColumnPicker({ hidden, onChange }) {
  const [open, setOpen] = useState(false);
  const visibleCount = COLUMNS.length - hidden.length;

  const toggle = (key) => {
    onChange(hidden.includes(key) ? hidden.filter(k => k !== key) : [...hidden, key]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-gdg-blue hover:text-gdg-blue"
        aria-expanded={open}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Columns
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.65rem] text-slate-500">{visibleCount}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <div className="max-h-72 overflow-y-auto">
              {COLUMNS.map(col => {
                const shown = !hidden.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggle(col.key)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-50 ${shown ? 'text-slate-700' : 'text-slate-400'}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${shown ? 'border-gdg-blue bg-gdg-blue text-white' : 'border-slate-300'}`}>
                      {shown && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {col.label}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange(DEFAULT_HIDDEN_COLUMNS)}
                className="text-xs font-semibold text-gdg-blue hover:underline"
              >
                Reset to default
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MultiSelect({ label, options, value, onChange, renderLabel }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const toggle = (opt) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  const filtered = options.filter(opt => {
    const optLabel = (opt.label ?? opt).toString().toLowerCase();
    return optLabel.includes(search.toLowerCase());
  });

  return (
    <div className="relative">
      <label className="ui-label">{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="ui-input flex w-full items-center justify-between gap-1 text-left"
      >
        {value.length === 0 ? (
          <span className="text-slate-400">All</span>
        ) : (
          <span className="flex flex-wrap gap-1 overflow-hidden">
            {value.map(v => (
              <span
                key={v}
                className="inline-flex items-center gap-0.5 rounded-md bg-gdg-blue/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-gdg-blue"
              >
                {renderLabel ? renderLabel(v) : v}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); toggle(v); }}
                  className="ml-0.5 text-gdg-blue/60 hover:text-gdg-blue"
                >
                  &times;
                </button>
              </span>
            ))}
          </span>
        )}
        <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-3 py-2">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm outline-none placeholder:text-slate-400 focus:border-gdg-blue focus:ring-1 focus:ring-gdg-blue/30"
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-center text-xs text-slate-400">No matches</div>
              )}
              {filtered.map(opt => {
                const selected = value.includes(opt.value ?? opt);
                const optValue = opt.value ?? opt;
                const optLabel = opt.label ?? opt;
                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={() => toggle(optValue)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${selected ? 'bg-gdg-blue/5 font-semibold text-gdg-blue' : 'text-slate-700'}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-gdg-blue bg-gdg-blue text-white' : 'border-slate-300'}`}>
                      {selected && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {optLabel}
                  </button>
                );
              })}
            </div>
            {value.length > 0 && (
              <div className="border-t border-slate-100 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-xs font-semibold text-gdg-red hover:underline"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function RegistrationsViewer() {
  const { hasRole } = useCurrentUser();
  // Volunteers never reach this page, but keep the destructive actions gated anyway.
  const canManage = hasRole(MANAGEMENT_ROLES);
  const { data: events } = useAdminEvents();
  const [selectedEvent, setSelectedEvent] = useState('');
  const { data: ambassadorOptions } = useEventAmbassadors(selectedEvent);

  // draft = what user is editing; applied = what is sent to API
  const [draftFilters, setDraftFilters]     = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortOrder, setSortOrder] = useState('DESC');

  // Grid presentation prefs, remembered per browser.
  const [filtersOpen, setFiltersOpen]     = useState(() => readPref(FILTERS_PREF_KEY, true));
  const [density, setDensity]             = useState(() => readPref(DENSITY_PREF_KEY, 'comfortable'));
  const [hiddenColumns, setHiddenColumns] = useState(() => readPref(COLUMN_PREF_KEY, DEFAULT_HIDDEN_COLUMNS));
  // 'people' = one row per registrant, 'teams' = one row per team.
  const [viewMode, setViewMode]           = useState(() => readPref(VIEW_PREF_KEY, 'people'));

  // Team rows are opened by position in the filtered list, mirroring how the
  // people grid tracks its open row.
  const [openTeamIndex, setOpenTeamIndex] = useState(null);

  // Row-detail drawer: index into the currently loaded page, plus the edge to
  // land on when Prev/Next steps across a page boundary.
  const [detailIndex, setDetailIndex] = useState(null);
  const [pendingEdge, setPendingEdge] = useState(null);

  useEffect(() => writePref(FILTERS_PREF_KEY, filtersOpen), [filtersOpen]);
  useEffect(() => writePref(DENSITY_PREF_KEY, density), [density]);
  useEffect(() => writePref(COLUMN_PREF_KEY, hiddenColumns), [hiddenColumns]);
  useEffect(() => writePref(VIEW_PREF_KEY, viewMode), [viewMode]);

  const visibleColumns = useMemo(
    () => COLUMNS.filter(c => !hiddenColumns.includes(c.key)),
    [hiddenColumns],
  );

  const lockMutation   = useLockAcknowledgements();
  const unlockMutation = useUnlockAcknowledgements();

  const eventList = Array.isArray(events) ? events : events?.data || [];
  const currentEvent = eventList.find(e => e.id === selectedEvent);
  const isAckLocked = currentEvent?.acknowledgement_locked ?? false;

  const updateStatusMutation = useUpdateRegistrationStatus();
  const bulkUpdateMutation   = useBulkUpdateStatus();
  const sendReminderMutation = useSendReminder();

  // Reminder modal state
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');

  // Rejection modal state
  const sendRejectionMutation = useSendRejection();
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [alsoReject, setAlsoReject] = useState(true);
  const [rejectionMessage, setRejectionMessage] = useState('');

  // WhatsApp group modal — the link, and nothing else in the email.
  const sendWhatsappMutation = useSendWhatsappGroup();
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // "Window closed" modal — for shortlisted people who never confirmed.
  const sendExpiredMutation = useSendAcknowledgementExpired();
  const [expiredOpen, setExpiredOpen] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState('');
  const [expiredAlsoReject, setExpiredAlsoReject] = useState(true);

  // Team message modal — captain on To, teammates on CC.
  const messageTeamsMutation = useMessageTeams();
  const [teamMessageOpen, setTeamMessageOpen] = useState(false);
  const [teamSubject, setTeamSubject] = useState('');
  const [teamMessage, setTeamMessage] = useState('');
  const [teamIncludeDetails, setTeamIncludeDetails] = useState(true);
  const [teamIncludeRoster, setTeamIncludeRoster] = useState(true);

  // Import CSV modal state
  const importCsvMutation = useImportCsvStatus();
  const [importOpen, setImportOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importStatus, setImportStatus] = useState('confirmed');

  // Soft delete / restore state
  const deleteMutation  = useDeleteRegistration();
  const restoreMutation = useRestoreRegistration();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const hasDraftChanges    = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const isActive = v => Array.isArray(v) ? v.length > 0 : v !== '';
  const activeAppliedCount = Object.values(appliedFilters).filter(isActive).length;
  const activeDraftCount   = Object.values(draftFilters).filter(isActive).length;

  const params = {
    name:            appliedFilters.name            || undefined,
    email:           appliedFilters.email           || undefined,
    phone:           appliedFilters.phone           || undefined,
    cnic:            appliedFilters.cnic            || undefined,
    status:          appliedFilters.status.length > 0 ? appliedFilters.status.join(',') : undefined,
    best_describes_you: appliedFilters.best_describes_you.length > 0 ? appliedFilters.best_describes_you.join(',') : undefined,
    gender:          appliedFilters.gender.length > 0 ? appliedFilters.gender.join(',') : undefined,
    domain:          appliedFilters.domain.length > 0 ? appliedFilters.domain.join(',') : undefined,
    ambassador:      appliedFilters.ambassador.length > 0 ? appliedFilters.ambassador.join(',') : undefined,
    registration_mode: appliedFilters.registration_mode || undefined,
    university_org:  appliedFilters.university_org  || undefined,
    checked_in:      appliedFilters.checked_in !== '' ? appliedFilters.checked_in === 'true' : undefined,
    acknowledged:
      appliedFilters.acknowledged !== '' ? appliedFilters.acknowledged === 'true' : undefined,
    date_from:       appliedFilters.date_from || undefined,
    date_to:         appliedFilters.date_to   || undefined,
    include_deleted: appliedFilters.include_deleted === 'true' ? true : undefined,
    sort_by:         'registered_at',
    sort_order:      sortOrder,
    page: limit === 0 ? 1 : page,
    limit: limit === 0 ? 999999 : limit,
  };

  const { data: result, isLoading } = useAdminRegistrations(selectedEvent, params);
  const registrations = result?.data    || [];
  const totalPages    = result?.totalPages || 1;
  const total         = result?.total   || 0;

  // Teams view. The event's teams arrive whole (rosters included) in one call,
  // so filtering and paging happen in memory — a team spans registrations that
  // the server-side pagination would otherwise split across pages.
  const { data: allTeams, isLoading: teamsLoading } = useTeams(viewMode === 'teams' ? selectedEvent : '');

  const teamRows = useMemo(() => {
    if (viewMode !== 'teams') return [];
    const rows = (Array.isArray(allTeams) ? allTeams : []).map(toTeamRow);

    const text  = (v) => (v || '').toLowerCase();
    const needle = text(appliedFilters.name);
    const orgNeedle = text(appliedFilters.university_org);
    const anyMember = (row, fn) => row.registrations.some(fn);

    return rows
      .filter(row => {
        // A team matches when the team itself does, or any of its members do —
        // filtering a roster down to matching members only would misrepresent
        // the team's size, which is the whole point of this view.
        if (needle && !(
          text(row.label).includes(needle) ||
          anyMember(row, r => text(r.attendee?.name).includes(needle))
        )) return false;

        if (appliedFilters.status.length > 0 &&
            !anyMember(row, r => appliedFilters.status.includes(r.status))) return false;

        if (appliedFilters.domain.length > 0 &&
            !(appliedFilters.domain.includes(row.domain) || anyMember(row, r => appliedFilters.domain.includes(r.domain)))) return false;

        if (appliedFilters.best_describes_you.length > 0 &&
            !anyMember(row, r => appliedFilters.best_describes_you.includes(r.attendee?.best_describes_you))) return false;

        if (appliedFilters.gender.length > 0 &&
            !anyMember(row, r => appliedFilters.gender.includes(r.attendee?.gender))) return false;

        if (appliedFilters.ambassador.length > 0 &&
            !anyMember(row, r => appliedFilters.ambassador.includes(r.ambassador))) return false;

        if (orgNeedle && !anyMember(row, r => text(r.attendee?.university_org).includes(orgNeedle))) return false;

        if (appliedFilters.email && !anyMember(row, r => text(r.attendee?.email).includes(text(appliedFilters.email)))) return false;
        if (appliedFilters.phone && !anyMember(row, r => text(r.attendee?.phone).includes(text(appliedFilters.phone)))) return false;
        if (appliedFilters.cnic  && !anyMember(row, r => text(r.attendee?.cnic).includes(text(appliedFilters.cnic)))) return false;

        if (appliedFilters.checked_in !== '' &&
            !anyMember(row, r => r.checked_in === (appliedFilters.checked_in === 'true'))) return false;
        if (appliedFilters.acknowledged !== '' &&
            !anyMember(row, r => r.acknowledged === (appliedFilters.acknowledged === 'true'))) return false;

        if (appliedFilters.date_from && !(row.registeredAt && row.registeredAt >= appliedFilters.date_from)) return false;
        if (appliedFilters.date_to && !(row.registeredAt && row.registeredAt <= `${appliedFilters.date_to}T23:59:59.999Z`)) return false;

        // A team whose every member is deleted only shows under "Show deleted".
        if (appliedFilters.include_deleted !== 'true' && row.memberCount === 0) return false;

        return true;
      })
      .sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0));
  }, [viewMode, allTeams, appliedFilters]);

  const openTeam = openTeamIndex == null ? null : teamRows[openTeamIndex] ?? null;

  // While a page-crossing Prev/Next is in flight the open row is expressed as
  // "whichever end of the next page lands", so it resolves during render
  // instead of needing an effect to re-sync once the fetch returns.
  const openIndex = pendingEdge
    ? (registrations.length > 0 ? (pendingEdge === 'first' ? 0 : registrations.length - 1) : null)
    : detailIndex;
  const detailRegistration = openIndex == null ? null : registrations[openIndex] ?? null;
  const detailOpen = pendingEdge
    ? isLoading || registrations.length > 0
    : detailIndex != null && (isLoading || detailRegistration != null);

  const firstRowOnPage = limit === 0 ? 1 : (page - 1) * limit + 1;
  const hasPrevRecord = openIndex != null && (openIndex > 0 || page > 1);
  const hasNextRecord =
    openIndex != null && (openIndex < registrations.length - 1 || (limit !== 0 && page < totalPages));

  const goPrevRecord = () => {
    if (openIndex == null) return;
    setPendingEdge(null);
    if (openIndex > 0) {
      setDetailIndex(openIndex - 1);
    } else if (page > 1) {
      setDetailIndex(null);
      setPendingEdge('last');
      setPage(p => p - 1);
    }
  };

  const goNextRecord = () => {
    if (openIndex == null) return;
    setPendingEdge(null);
    if (openIndex < registrations.length - 1) {
      setDetailIndex(openIndex + 1);
    } else if (limit !== 0 && page < totalPages) {
      setDetailIndex(null);
      setPendingEdge('first');
      setPage(p => p + 1);
    }
  };

  const openDetail = (idx) => {
    setPendingEdge(null);
    setDetailIndex(idx);
  };

  const closeDetail = () => {
    setDetailIndex(null);
    setPendingEdge(null);
  };

  const setDraftFilter = (key, value) => setDraftFilters(prev => ({ ...prev, [key]: value }));

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
    setSelectedIds(new Set());
    closeDetail();
  };

  const clearAllFilters = () => {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
    setSelectedIds(new Set());
    closeDetail();
  };

  // Checkbox helpers
  const allSelected  = registrations.length > 0 && registrations.every(r => selectedIds.has(r.id));
  const someSelected = registrations.some(r => selectedIds.has(r.id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(registrations.map(r => r.id)));
    }
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Teams view selection resolves to the member registration ids, so Export CSV,
  // bulk status, reminders and rejections keep operating on registrations and
  // need no knowledge of teams.
  const isTeamSelected  = (row) => row.memberIds.length > 0 && row.memberIds.every(id => selectedIds.has(id));
  const allTeamsSelected  = teamRows.length > 0 && teamRows.every(isTeamSelected);
  const someTeamsSelected = teamRows.some(row => row.memberIds.some(id => selectedIds.has(id))) && !allTeamsSelected;

  const toggleTeam = (row) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const selected = row.memberIds.length > 0 && row.memberIds.every(id => next.has(id));
      row.memberIds.forEach(id => (selected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleAllTeams = () => {
    if (allTeamsSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      teamRows.forEach(row => row.memberIds.forEach(id => next.add(id)));
      return next;
    });
  };

  const closeTeamDetail = () => setOpenTeamIndex(null);

  const switchView = (mode) => {
    if (mode === viewMode) return;
    // The two grids count rows differently, so a selection carried across would
    // be invisible in the grid the admin is now looking at.
    setViewMode(mode);
    setSelectedIds(new Set());
    closeDetail();
    closeTeamDetail();
  };

  const hasPrevTeam = openTeamIndex != null && openTeamIndex > 0;
  const hasNextTeam = openTeamIndex != null && openTeamIndex < teamRows.length - 1;

  // The drawer is registration-shaped, so a team opens on its captain with the
  // team attached — that is what makes its roster tab load.
  const teamDrawerRegistration = openTeam
    ? (() => {
        const base = openTeam.captain || openTeam.registrations[0] || null;
        if (!base) return null;
        return {
          ...base,
          team: {
            id: openTeam.id,
            team_number: openTeam.teamNumber,
            name: openTeam.name,
            origin: openTeam.origin,
          },
        };
      })()
    : null;

  // Teams whose whole roster is selected — asking for a deposit is a team-level
  // act, so a partially-ticked team is deliberately not included.
  const selectedTeams = teamRows.filter(isTeamSelected);
  const requestPaymentMutation = useRequestTeamPayment();

  const handleRequestDeposit = async () => {
    if (selectedTeams.length === 0) return;
    try {
      const result = await requestPaymentMutation.mutateAsync(selectedTeams.map(t => t.id));
      if (result.requested > 0) {
        toast.success(`Deposit requested from ${result.requested} team${result.requested === 1 ? '' : 's'}`);
      }
      // Skips are worth surfacing: already-paid teams are not re-asked, and a
      // team whose email bounced never had its clock started.
      if (result.failed?.length > 0) {
        toast(`${result.failed.length} skipped — ${result.failed[0].reason}`, { icon: '⚠️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not request deposits');
    }
  };

  /**
   * Which teams the selection points at, in either grid.
   *
   * In the teams view a team counts only when its whole roster is ticked, the
   * same rule the deposit request uses. In the people view any selected member
   * pulls in their team — the email goes to the entire roster regardless of who
   * was ticked, so requiring the whole team to be selected first would be a
   * hurdle that changes nothing about what gets sent. The modal says so plainly.
   */
  const messageTeams = viewMode === 'teams'
    ? selectedTeams.map(t => ({
        id: t.id,
        label: t.label,
        memberCount: t.memberCount,
        fullyShortlisted: t.memberCount > 0 && (t.statusCounts.shortlisted ?? 0) === t.memberCount,
      }))
    : (() => {
        // Rows carry only a team stub, so roster size is unknown here — the
        // count of teams is the honest number to show.
        const byId = new Map();
        for (const r of registrations) {
          if (!selectedIds.has(r.id) || !r.team?.id) continue;
          if (byId.has(r.team.id)) continue;
          byId.set(r.team.id, {
            id: r.team.id,
            label: [r.team.team_number != null ? `#${r.team.team_number}` : null, r.team.name]
              .filter(Boolean).join(' · ') || 'Team',
            memberCount: null,
            fullyShortlisted: false,
          });
        }
        return [...byId.values()];
      })();

  // Everyone the team email will reach — one To per team, the rest CC'd. Only
  // knowable in the teams view, where the rosters are loaded.
  const teamMessageRecipients = viewMode === 'teams'
    ? messageTeams.reduce((n, t) => n + t.memberCount, 0)
    : null;
  const shortlistedTeamCount = messageTeams.filter(t => t.fullyShortlisted).length;

  // People-view rows that are on no team at all — they get nothing from this.
  const selectedWithoutTeam = viewMode === 'teams'
    ? 0
    : registrations.filter(r => selectedIds.has(r.id) && !r.team?.id).length;

  const openTeamMessageModal = () => {
    if (messageTeams.length === 0) return;
    setTeamSubject('');
    setTeamMessage('');
    setTeamIncludeDetails(true);
    setTeamIncludeRoster(true);
    setTeamMessageOpen(true);
  };

  const sendTeamMessage = async () => {
    if (messageTeams.length === 0 || !teamMessage.trim()) return;
    try {
      const result = await messageTeamsMutation.mutateAsync({
        teamIds: messageTeams.map(t => t.id),
        subject: teamSubject,
        message: teamMessage,
        includeEventDetails: teamIncludeDetails,
        includeRoster: teamIncludeRoster,
      });
      if (result.sent > 0) {
        toast.success(`Emailed ${result.sent} team${result.sent === 1 ? '' : 's'} — captains, teammates CC'd`);
      }
      if (result.failed?.length > 0) {
        toast(`${result.failed.length} team(s) skipped — ${result.failed[0].reason}`, { icon: '⚠️' });
      }
      setTeamMessageOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the team email');
    }
  };

  const handleTeamStatusChange = async (_registrationId, status) => {
    if (!openTeam || openTeam.memberIds.length === 0) return;
    try {
      await bulkUpdateMutation.mutateAsync({ ids: openTeam.memberIds, status });
      toast.success(`Team ${openTeam.label} → ${STATUS_LABELS[status] ?? status} (${openTeam.memberIds.length} members)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update team status');
    }
  };

  const handleBulkUpdate = async (status) => {
    if (selectedIds.size === 0) return;
    try {
      const result = await bulkUpdateMutation.mutateAsync({ ids: Array.from(selectedIds), status });
      if (result.failed?.length > 0) {
        toast.success(`${result.succeeded.length} updated`);
        toast.error(`${result.failed.length} could not be updated (invalid transition)`);
      } else {
        toast.success(`${result.succeeded.length} registration(s) → ${status}`);
      }
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk update failed');
    }
  };

  // How many of the currently selected rows are reminder-eligible
  const reminderEligibleSelected = registrations.filter(
    r => selectedIds.has(r.id) && (r.status === 'shortlisted' || r.status === 'confirmed'),
  ).length;

  const rejectionEligibleSelected = registrations.filter(
    r => selectedIds.has(r.id) && r.status !== 'attended',
  ).length;

  // Shortlisted but never confirmed — the only people whose window can close.
  // A row already flagged expired stays eligible so a failed send can be retried.
  const expiredEligibleSelected = registrations.filter(
    r => selectedIds.has(r.id) &&
      !r.acknowledged &&
      !r.deleted_at &&
      (r.status === 'shortlisted' || r.acknowledgement_expired),
  ).length;

  const openReminderModal = () => {
    if (selectedIds.size === 0) return;
    setReminderMessage('');
    setReminderOpen(true);
  };

  // The group is for participants, so the same eligibility as the reminder.
  const whatsappEligibleSelected = reminderEligibleSelected;

  // Checked here as well as on the server: catching a wrong paste before the
  // send button lights up is cheaper than catching it after.
  const whatsappLinkValid = /^https:\/\/chat\.whatsapp\.com\/\S+$/i.test(whatsappLink.trim());

  const openWhatsappModal = () => {
    if (selectedIds.size === 0) return;
    setWhatsappLink(readPref(`${WHATSAPP_PREF_KEY}.${selectedEvent}`, ''));
    setWhatsappMessage('');
    setWhatsappOpen(true);
  };

  const sendWhatsappGroup = async () => {
    if (selectedIds.size === 0 || !whatsappLinkValid) return;
    try {
      const result = await sendWhatsappMutation.mutateAsync({
        ids: Array.from(selectedIds),
        groupUrl: whatsappLink.trim(),
        message: whatsappMessage,
      });
      if (result.sent > 0) {
        toast.success(`Group link sent to ${result.sent} recipient(s)`);
        writePref(`${WHATSAPP_PREF_KEY}.${selectedEvent}`, whatsappLink.trim());
      }
      if (result.failed?.length > 0) {
        toast(`${result.failed.length} skipped — ${result.failed[0].error}`, { icon: '⚠️' });
      }
      setWhatsappOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send the group link');
    }
  };

  const openExpiredModal = () => {
    if (selectedIds.size === 0) return;
    setExpiredMessage('');
    setExpiredAlsoReject(true);
    setExpiredOpen(true);
  };

  const sendExpired = async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await sendExpiredMutation.mutateAsync({
        ids: Array.from(selectedIds),
        message: expiredMessage,
        alsoReject: expiredAlsoReject,
      });
      const parts = [];
      if (result.sent > 0) parts.push(`Notified ${result.sent} recipient(s)`);
      if (result.expired > 0) parts.push(`${result.expired} marked expired`);
      if (result.statusUpdated > 0) parts.push(`${result.statusUpdated} rejected`);
      if (parts.length > 0) toast.success(parts.join('. '));
      if (result.failed?.length > 0) {
        toast(`${result.failed.length} skipped — ${result.failed[0].error}`, { icon: '⚠️' });
      }
      setExpiredOpen(false);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send expiry notices');
    }
  };

  const openRejectionModal = () => {
    if (selectedIds.size === 0) return;
    setAlsoReject(true);
    setRejectionMessage('');
    setRejectionOpen(true);
  };

  const sendRejection = async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await sendRejectionMutation.mutateAsync({
        ids: Array.from(selectedIds),
        alsoReject,
        message: rejectionMessage,
      });
      const parts = [];
      if (result.sent > 0) parts.push(`Rejection email sent to ${result.sent} recipient(s)`);
      if (result.statusUpdated > 0) parts.push(`${result.statusUpdated} status(es) updated to rejected`);
      if (parts.length > 0) toast.success(parts.join('. '));
      if (result.failed?.length > 0) {
        toast.error(`${result.failed.length} failed`);
      }
      setRejectionOpen(false);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send rejection emails');
    }
  };

  const sendReminder = async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await sendReminderMutation.mutateAsync({
        ids: Array.from(selectedIds),
        message: reminderMessage,
      });
      if (result.failed?.length > 0) {
        toast.success(`Reminder sent to ${result.sent} recipient(s)`);
        toast.error(`${result.failed.length} skipped (not shortlisted/confirmed)`);
      } else {
        toast.success(`Reminder sent to ${result.sent} recipient(s)`);
      }
      setReminderOpen(false);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      toast.success(`Status → ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const name = deleteTarget.attendee?.name || 'This registration';
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`${name} deleted — their seat is free. Turn on "Show deleted" to restore.`);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete registration');
    }
  };

  const handleRestore = async (registration) => {
    const name = registration.attendee?.name || 'Registration';
    try {
      await restoreMutation.mutateAsync(registration.id);
      toast.success(`${name} restored`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore registration');
    }
  };

  const handleImportCsv = async () => {
    if (!importCsvText.trim()) return;
    try {
      const result = await importCsvMutation.mutateAsync({ csv: importCsvText, status: importStatus });
      if (result.failed?.length > 0) {
        toast.success(`${result.succeeded.length} updated to ${importStatus}`);
        toast.error(`${result.failed.length} failed (invalid transition or not found)`);
      } else {
        toast.success(`${result.succeeded.length} registration(s) updated to ${importStatus}`);
      }
      setImportOpen(false);
      setImportCsvText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportCsvText(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = async (onlySelected = false) => {
    if (!selectedEvent) return;
    try {
      const ids = onlySelected ? [...selectedIds] : undefined;
      const blob = await adminRegistrationApi.exportCsv(selectedEvent, ids);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `registrations-${selectedEvent}${onlySelected ? '-selected' : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`CSV exported${onlySelected ? ` (${selectedIds.size} selected)` : ''}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const inputCls = 'ui-input';
  const labelCls = 'ui-label';

  // Sticky header cells need their own background so rows scroll under them.
  const stickyHeadCls   = 'sticky top-0 border-b border-slate-200 py-3';
  const densityCellCls  = density === 'compact' ? 'py-1.5 text-[0.8125rem]' : 'py-2.5';

  return (
    <div>
      <div className="admin-page-head">
        <h1>Registrations</h1>
        <p>View, filter, and manage registrations per event.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 sm:max-w-sm sm:flex-1">
          <label className={labelCls} htmlFor="reg-event-select">
            Event
          </label>
          <select
            id="reg-event-select"
            className={inputCls}
            value={selectedEvent}
            onChange={e => {
              setSelectedEvent(e.target.value);
              setPage(1);
              setSelectedIds(new Set());
              closeDetail();
            }}
          >
            <option value="">Select an event</option>
            {(Array.isArray(events) ? events : events?.data || [])?.map(w => (
              <option key={w.id} value={w.id}>
                {w.title}{w.event_type?.name ? ` — ${w.event_type.name}` : ''}
              </option>
            ))}
          </select>
        </div>
        {selectedEvent && (
          <>
            <button type="button" className="ui-btn-secondary w-full shrink-0 sm:w-auto" onClick={handleExport}>
              Export CSV
            </button>
            <button
              type="button"
              className="ui-btn-secondary w-full shrink-0 sm:w-auto"
              onClick={() => { setImportCsvText(''); setImportStatus('confirmed'); setImportOpen(true); }}
            >
              Import IDs
            </button>
            {isAckLocked ? (
              <button
                type="button"
                className="w-full shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
                disabled={unlockMutation.isPending}
                onClick={async () => {
                  try {
                    await unlockMutation.mutateAsync(selectedEvent);
                    toast.success('Acknowledgements unlocked — new shortlisted people can now confirm');
                  } catch { toast.error('Failed to unlock'); }
                }}
              >
                {unlockMutation.isPending ? 'Unlocking…' : 'Unlock Acknowledgements'}
              </button>
            ) : (
              <button
                type="button"
                className="w-full shrink-0 rounded-xl bg-gdg-red px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-500/20 hover:bg-red-600 disabled:opacity-50 sm:w-auto"
                disabled={lockMutation.isPending}
                onClick={async () => {
                  if (!confirm('Lock acknowledgements? All unconfirmed shortlisted people will be permanently blocked from confirming.')) return;
                  try {
                    const result = await lockMutation.mutateAsync(selectedEvent);
                    toast.success(`Locked — ${result.expired_count} unconfirmed registration(s) expired`);
                  } catch { toast.error('Failed to lock'); }
                }}
              >
                {lockMutation.isPending ? 'Locking…' : 'Lock Acknowledgements'}
              </button>
            )}
          </>
        )}
      </div>

      {selectedEvent && (
        <div className="ui-card-quiet mb-6 p-4 sm:p-5">
          <div className={`flex flex-wrap items-center justify-between gap-2 ${filtersOpen ? 'mb-4' : ''}`}>
            <button
              type="button"
              onClick={() => setFiltersOpen(o => !o)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900"
              aria-expanded={filtersOpen}
            >
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${filtersOpen ? '' : '-rotate-90'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              Filters
              {activeAppliedCount > 0 && (
                <span className="ml-1 rounded-full bg-gdg-blue px-2 py-0.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20">
                  {activeAppliedCount} active
                </span>
              )}
              {!filtersOpen && (
                <span className="ml-1 text-xs font-medium text-slate-400">(show)</span>
              )}
            </button>
            {(activeDraftCount > 0 || activeAppliedCount > 0) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-gdg-red hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {filtersOpen && (
          <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} placeholder="Search name..." value={draftFilters.name} onChange={e => setDraftFilter('name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} placeholder="Search email..." value={draftFilters.email} onChange={e => setDraftFilter('email', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} placeholder="Search phone..." value={draftFilters.phone} onChange={e => setDraftFilter('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>CNIC</label>
              <input className={inputCls} placeholder="Search CNIC..." value={draftFilters.cnic} onChange={e => setDraftFilter('cnic', e.target.value)} />
            </div>
            <MultiSelect
              label="Status"
              options={STATUS_FILTER_OPTIONS}
              value={draftFilters.status}
              onChange={v => setDraftFilter('status', v)}
              renderLabel={v => STATUS_LABELS[v] ?? v}
            />
            <MultiSelect
              label="Profile / primary skill"
              options={PROFILE_OPTIONS}
              value={draftFilters.best_describes_you}
              onChange={v => setDraftFilter('best_describes_you', v)}
            />
            <MultiSelect
              label="Gender"
              options={GENDER_OPTIONS}
              value={draftFilters.gender}
              onChange={v => setDraftFilter('gender', v)}
            />
            <MultiSelect
              label="Domain (Hackathon)"
              options={DOMAIN_OPTIONS}
              value={draftFilters.domain}
              onChange={v => setDraftFilter('domain', v)}
            />
            <MultiSelect
              label="Ambassador"
              options={ambassadorOptions || []}
              value={draftFilters.ambassador}
              onChange={v => setDraftFilter('ambassador', v)}
            />
            <div>
              <label className={labelCls}>Registration mode</label>
              <select className={inputCls} value={draftFilters.registration_mode} onChange={e => setDraftFilter('registration_mode', e.target.value)}>
                <option value="">All</option>
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>University / Org</label>
              <input className={inputCls} placeholder="Search organization..." value={draftFilters.university_org} onChange={e => setDraftFilter('university_org', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Spot acknowledged (email)</label>
              <select className={inputCls} value={draftFilters.acknowledged} onChange={e => setDraftFilter('acknowledged', e.target.value)}>
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Registered from</label>
              <input type="date" className={inputCls} value={draftFilters.date_from} onChange={e => setDraftFilter('date_from', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Registered to</label>
              <input type="date" className={inputCls} value={draftFilters.date_to} onChange={e => setDraftFilter('date_to', e.target.value)} />
            </div>
            {canManage && (
              <div>
                <label className={labelCls}>Deleted</label>
                <label className={`${inputCls} flex cursor-pointer items-center gap-2`}>
                  <input
                    type="checkbox"
                    checked={draftFilters.include_deleted === 'true'}
                    onChange={e => setDraftFilter('include_deleted', e.target.checked ? 'true' : '')}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded accent-gdg-blue"
                  />
                  <span className="text-sm text-slate-700">Show deleted</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={applyFilters}
              disabled={!hasDraftChanges}
              className={`rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors ${
                hasDraftChanges ? 'bg-gdg-blue shadow-sm shadow-blue-500/20 hover:bg-blue-600' : 'cursor-not-allowed bg-slate-300'
              }`}
            >
              Apply filters
            </button>
            {hasDraftChanges && (
              <span className="text-xs italic text-slate-500">
                Unapplied changes — click Apply to refresh results
              </span>
            )}
          </div>
          </>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-admin-sidebar px-3 py-3 text-white shadow-lg shadow-slate-900/15 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{selectedIds.size} selected</span>
            <span className="hidden text-slate-500 sm:inline">|</span>
            <span className="text-xs text-slate-400">Set status:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {BULK_STATUSES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleBulkUpdate(s)}
                disabled={bulkUpdateMutation.isPending}
                className={`rounded-lg px-2.5 py-1.5 text-[0.7rem] font-semibold disabled:opacity-50 sm:px-3 sm:text-xs ${STATUS_BUTTON_COLORS[s]}`}
              >
                {STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>
          {viewMode === 'teams' && selectedTeams.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden text-slate-500 sm:inline">|</span>
              <button
                type="button"
                onClick={handleRequestDeposit}
                disabled={requestPaymentMutation.isPending}
                className="rounded-lg bg-amber-400 px-2.5 py-1.5 text-[0.7rem] font-semibold text-slate-900 disabled:opacity-50 sm:px-3 sm:text-xs"
                title="Emails each captain and starts their 24-hour deposit window"
              >
                {requestPaymentMutation.isPending
                  ? 'Requesting…'
                  : `Request deposit (${selectedTeams.length})`}
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={() => handleExport(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-2.5 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm hover:bg-slate-700 sm:px-3 sm:text-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export selected
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[0.65rem]">{selectedIds.size}</span>
            </button>
            <button
              type="button"
              onClick={openReminderModal}
              disabled={reminderEligibleSelected === 0}
              title={reminderEligibleSelected === 0
                ? 'Reminder is only available for shortlisted or confirmed registrations'
                : `Will send to ${reminderEligibleSelected} eligible recipient(s)`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm shadow-amber-500/25 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Send reminder
              {reminderEligibleSelected > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[0.65rem]">{reminderEligibleSelected}</span>
              )}
            </button>
            <button
              type="button"
              onClick={openWhatsappModal}
              disabled={whatsappEligibleSelected === 0}
              title={whatsappEligibleSelected === 0
                ? 'The group link only goes to shortlisted or confirmed participants'
                : `Will send the group link to ${whatsappEligibleSelected} recipient(s)`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm hover:bg-[#1da851] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              WhatsApp group
              {whatsappEligibleSelected > 0 && (
                <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[0.65rem]">{whatsappEligibleSelected}</span>
              )}
            </button>
            <button
              type="button"
              onClick={openTeamMessageModal}
              disabled={messageTeams.length === 0 || messageTeamsMutation.isPending}
              title={messageTeams.length === 0
                ? 'None of the selected registrations are on a team'
                : `Emails ${messageTeams.length} captain(s) with their teammates on CC`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gdg-blue px-2.5 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              Email team{messageTeams.length === 1 ? '' : 's'}
              {messageTeams.length > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[0.65rem]">{messageTeams.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={openExpiredModal}
              disabled={expiredEligibleSelected === 0}
              title={expiredEligibleSelected === 0
                ? 'Only shortlisted registrations that never confirmed can expire'
                : `Will tell ${expiredEligibleSelected} recipient(s) their window closed`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-500 px-2.5 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Window closed
              {expiredEligibleSelected > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[0.65rem]">{expiredEligibleSelected}</span>
              )}
            </button>
            <button
              type="button"
              onClick={openRejectionModal}
              disabled={rejectionEligibleSelected === 0}
              title={rejectionEligibleSelected === 0
                ? 'No eligible registrations selected'
                : `Will send rejection email to ${rejectionEligibleSelected} recipient(s)`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gdg-red px-2.5 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm shadow-red-500/20 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5-7.875l-1.45.78M2.25 12.375l1.45.78" />
              </svg>
              Send rejection
              {rejectionEligibleSelected > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[0.65rem]">{rejectionEligibleSelected}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-left text-xs text-slate-400 hover:text-white sm:text-right"
            >
              Deselect all
            </button>
          </div>
        </div>
      )}

      {/* Reminder modal */}
      {reminderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !sendReminderMutation.isPending && setReminderOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Send reminder email</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Re-sends the entry pass (QR code) + event instructions to shortlisted/confirmed recipients.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReminderOpen(false)}
                disabled={sendReminderMutation.isPending}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200/70">
              <strong>{reminderEligibleSelected}</strong> of {selectedIds.size} selected registration(s) are eligible.
              {selectedIds.size - reminderEligibleSelected > 0 && (
                <span> {selectedIds.size - reminderEligibleSelected} will be skipped (not shortlisted/confirmed).</span>
              )}
            </div>

            <label className="ui-label" htmlFor="reminder-message">
              Custom message (optional)
            </label>
            <textarea
              id="reminder-message"
              className={`${inputCls} min-h-[120px] resize-y`}
              placeholder="e.g. The venue entrance has moved to the side gate — please arrive 15 minutes early."
              value={reminderMessage}
              onChange={e => setReminderMessage(e.target.value)}
              maxLength={2000}
              disabled={sendReminderMutation.isPending}
            />
            <p className="mt-1 text-right text-[0.65rem] text-slate-400">
              {reminderMessage.length}/2000
            </p>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setReminderOpen(false)}
                disabled={sendReminderMutation.isPending}
                className="ui-btn-secondary !px-4 !py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendReminder}
                disabled={sendReminderMutation.isPending || reminderEligibleSelected === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-500/25 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendReminderMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>Send to {reminderEligibleSelected} recipient(s)</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection modal */}
      {rejectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !sendRejectionMutation.isPending && setRejectionOpen(false)}>
          <div
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Send rejection email</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Send a rejection notification to the selected registrations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectionOpen(false)}
                disabled={sendRejectionMutation.isPending}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900 ring-1 ring-rose-200/70">
              <strong>{selectedIds.size}</strong> registration(s) selected.
              {rejectionEligibleSelected < selectedIds.size && (
                <span> {selectedIds.size - rejectionEligibleSelected} will be skipped (already attended).</span>
              )}
            </div>

            <label className="ui-label" htmlFor="rejection-message">Custom message (optional)</label>
            <textarea
              id="rejection-message"
              className={`${inputCls} min-h-[110px] resize-y`}
              placeholder="e.g. This cohort was picked for prior Python experience, which we asked about in the form. The next intake opens in March and previous applicants are very welcome."
              value={rejectionMessage}
              onChange={e => setRejectionMessage(e.target.value)}
              maxLength={2000}
              disabled={sendRejectionMutation.isPending}
            />
            <p className="mt-1 text-right text-[0.65rem] text-slate-400">{rejectionMessage.length}/2000</p>
            <p className="mb-3 text-xs text-slate-500">
              Added after the standard paragraph, not instead of it — everyone still gets the reason and the encouragement to apply again.
            </p>

            <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={alsoReject}
                onChange={e => setAlsoReject(e.target.checked)}
                disabled={sendRejectionMutation.isPending}
                className="h-4 w-4 rounded accent-gdg-red"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">Also update status to Rejected</span>
                <p className="text-xs text-slate-500 mt-0.5">If unchecked, only the email is sent without changing the registration status.</p>
              </div>
            </label>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionOpen(false)}
                disabled={sendRejectionMutation.isPending}
                className="ui-btn-secondary !px-4 !py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendRejection}
                disabled={sendRejectionMutation.isPending || rejectionEligibleSelected === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-gdg-red px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-500/20 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendRejectionMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>Send to {rejectionEligibleSelected} recipient(s)</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp group modal — the link is the whole email */}
      {whatsappOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !sendWhatsappMutation.isPending && setWhatsappOpen(false)}>
          <div
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Send the WhatsApp group link</h2>
                <p className="mt-1 text-xs text-slate-500">
                  A short email containing the group link and nothing else — no entry pass, no schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappOpen(false)}
                disabled={sendWhatsappMutation.isPending}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900 ring-1 ring-emerald-200/70">
              <strong>{whatsappEligibleSelected}</strong> of {selectedIds.size} selected registration(s) are eligible.
              {selectedIds.size - whatsappEligibleSelected > 0 && (
                <span> {selectedIds.size - whatsappEligibleSelected} will be skipped (not shortlisted/confirmed).</span>
              )}
            </div>

            <label className="ui-label" htmlFor="whatsapp-link">Group invite link</label>
            <input
              id="whatsapp-link"
              type="url"
              inputMode="url"
              className={`${inputCls} font-mono text-sm ${whatsappLink && !whatsappLinkValid ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
              placeholder="https://chat.whatsapp.com/…"
              value={whatsappLink}
              onChange={e => setWhatsappLink(e.target.value)}
              disabled={sendWhatsappMutation.isPending}
              autoFocus
            />
            {whatsappLink && !whatsappLinkValid ? (
              <p className="mt-1 text-xs font-medium text-gdg-red">
                That is not a group invite link. In WhatsApp: open the group → Invite via link → Copy link. It starts with https://chat.whatsapp.com/
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Remembered for this event, so you only paste it once.
              </p>
            )}

            <label className="ui-label mt-3" htmlFor="whatsapp-note">Short note (optional)</label>
            <textarea
              id="whatsapp-note"
              className={`${inputCls} min-h-[90px] resize-y`}
              placeholder="e.g. All day-of announcements go here, so please join before Friday."
              value={whatsappMessage}
              onChange={e => setWhatsappMessage(e.target.value)}
              maxLength={1000}
              disabled={sendWhatsappMutation.isPending}
            />
            <p className="mt-1 text-right text-[0.65rem] text-slate-400">{whatsappMessage.length}/1000</p>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setWhatsappOpen(false)}
                disabled={sendWhatsappMutation.isPending}
                className="ui-btn-secondary !px-4 !py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendWhatsappGroup}
                disabled={sendWhatsappMutation.isPending || !whatsappLinkValid || whatsappEligibleSelected === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1da851] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendWhatsappMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>Send link to {whatsappEligibleSelected} recipient(s)</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team message modal — one email per team, captain To, teammates CC */}
      {teamMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !messageTeamsMutation.isPending && setTeamMessageOpen(false)}>
          <div
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Email selected teams</h2>
                <p className="mt-1 text-xs text-slate-500">
                  One email per team — the captain on <strong>To</strong>, every teammate on <strong>CC</strong>, so replies reach the whole team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTeamMessageOpen(false)}
                disabled={messageTeamsMutation.isPending}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 ring-1 ring-sky-200/70">
              <strong>{messageTeams.length}</strong> team(s)
              {teamMessageRecipients != null && <> · <strong>{teamMessageRecipients}</strong> recipient(s)</>}.
              {viewMode === 'teams' ? (
                <>
                  {shortlistedTeamCount > 0 && <span> {shortlistedTeamCount} fully shortlisted.</span>}
                  {shortlistedTeamCount < messageTeams.length && (
                    <span> {messageTeams.length - shortlistedTeamCount} not fully shortlisted — they will be emailed too.</span>
                  )}
                </>
              ) : (
                <span> Every member of each team is emailed, including anyone you did not select.</span>
              )}
              {selectedWithoutTeam > 0 && (
                <span> {selectedWithoutTeam} selected registration(s) are on no team and get nothing.</span>
              )}
            </div>
            {viewMode !== 'teams' && messageTeams.length > 0 && (
              <p className="mb-3 text-xs text-slate-500">
                Going to: {messageTeams.map(t => t.label).join(', ')}
              </p>
            )}

            <label className="ui-label" htmlFor="team-subject">Subject (optional)</label>
            <input
              id="team-subject"
              type="text"
              className={inputCls}
              placeholder="Defaults to “<event> — a message for #12 · Team name”"
              value={teamSubject}
              onChange={e => setTeamSubject(e.target.value)}
              maxLength={150}
              disabled={messageTeamsMutation.isPending}
            />

            <label className="ui-label mt-3" htmlFor="team-message">Message</label>
            <textarea
              id="team-message"
              className={`${inputCls} min-h-[140px] resize-y`}
              placeholder="e.g. Doors open at 8:30 AM at the side gate. Bring your own laptop and charger — power strips are limited. Your table number will be on the board at entry."
              value={teamMessage}
              onChange={e => setTeamMessage(e.target.value)}
              maxLength={4000}
              disabled={messageTeamsMutation.isPending}
            />
            <p className="mt-1 text-right text-[0.65rem] text-slate-400">{teamMessage.length}/4000</p>

            <div className="mt-2 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={teamIncludeDetails}
                  onChange={e => setTeamIncludeDetails(e.target.checked)}
                  disabled={messageTeamsMutation.isPending}
                  className="h-4 w-4 rounded accent-gdg-blue"
                />
                <span className="text-sm text-slate-700">Include event date, time and venue</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={teamIncludeRoster}
                  onChange={e => setTeamIncludeRoster(e.target.checked)}
                  disabled={messageTeamsMutation.isPending}
                  className="h-4 w-4 rounded accent-gdg-blue"
                />
                <span className="text-sm text-slate-700">Include the team roster and who was emailed</span>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setTeamMessageOpen(false)}
                disabled={messageTeamsMutation.isPending}
                className="ui-btn-secondary !px-4 !py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendTeamMessage}
                disabled={messageTeamsMutation.isPending || !teamMessage.trim() || messageTeams.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-gdg-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {messageTeamsMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>Send to {messageTeams.length} team{messageTeams.length === 1 ? '' : 's'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "Window closed" modal — unconfirmed shortlisted registrations */}
      {expiredOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !sendExpiredMutation.isPending && setExpiredOpen(false)}>
          <div
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tell them the window closed</h2>
                <p className="mt-1 text-xs text-slate-500">
                  For shortlisted people who never confirmed: the deadline has passed and their spot has been released.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpiredOpen(false)}
                disabled={sendExpiredMutation.isPending}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200/80">
              <strong>{expiredEligibleSelected}</strong> of {selectedIds.size} selected registration(s) are eligible.
              {selectedIds.size - expiredEligibleSelected > 0 && (
                <span> {selectedIds.size - expiredEligibleSelected} will be skipped (already confirmed, or not shortlisted).</span>
              )}
            </div>

            <label className="ui-label" htmlFor="expired-message">Extra note (optional)</label>
            <textarea
              id="expired-message"
              className={`${inputCls} min-h-[110px] resize-y`}
              placeholder="e.g. We held confirmations open until Friday 6 PM and had a long waiting list. Watch this space — the next workshop opens in two weeks."
              value={expiredMessage}
              onChange={e => setExpiredMessage(e.target.value)}
              maxLength={2000}
              disabled={sendExpiredMutation.isPending}
            />
            <p className="mt-1 text-right text-[0.65rem] text-slate-400">{expiredMessage.length}/2000</p>

            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-3">
              <input
                type="checkbox"
                checked={expiredAlsoReject}
                onChange={e => setExpiredAlsoReject(e.target.checked)}
                disabled={sendExpiredMutation.isPending}
                className="h-4 w-4 rounded accent-gdg-red"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">Also set status to Rejected</span>
                <p className="mt-0.5 text-xs text-slate-500">
                  They are flagged as expired either way. Leave this on to free the seat outright.
                </p>
              </div>
            </label>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setExpiredOpen(false)}
                disabled={sendExpiredMutation.isPending}
                className="ui-btn-secondary !px-4 !py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendExpired}
                disabled={sendExpiredMutation.isPending || expiredEligibleSelected === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendExpiredMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>Notify {expiredEligibleSelected} recipient(s)</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !importCsvMutation.isPending && setImportOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Import IDs &mdash; bulk status update</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a CSV file or paste registration IDs (one per line or comma-separated) to update their status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                disabled={importCsvMutation.isPending}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-3">
              <label className="ui-label">Target status</label>
              <select
                className="ui-input"
                value={importStatus}
                onChange={e => setImportStatus(e.target.value)}
                disabled={importCsvMutation.isPending}
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="ui-label">Upload CSV file</label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleImportFile}
                disabled={importCsvMutation.isPending}
                className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gdg-blue/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gdg-blue hover:file:bg-gdg-blue/20"
              />
            </div>

            <label className="ui-label" htmlFor="import-csv-text">
              Or paste IDs below
            </label>
            <textarea
              id="import-csv-text"
              className={`${inputCls} min-h-[120px] resize-y font-mono text-xs`}
              placeholder={"Paste IDs — one per line or comma-separated:\ne.g.\n3f2a...b1c4\n7d8e...f9a0"}
              value={importCsvText}
              onChange={e => setImportCsvText(e.target.value)}
              disabled={importCsvMutation.isPending}
            />
            {importCsvText.trim() && (
              <p className="mt-1 text-xs text-slate-500">
                {importCsvText.split(/[\r\n,]+/).filter(id => id.trim().length > 0).length} ID(s) detected
              </p>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                disabled={importCsvMutation.isPending}
                className="ui-btn-secondary !px-4 !py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                disabled={importCsvMutation.isPending || !importCsvText.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gdg-blue px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importCsvMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden />
                    Updating…
                  </>
                ) : (
                  <>Update to {STATUS_LABELS[importStatus]}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
          role="presentation"
        >
          <div
            className="ui-card w-full max-w-md rounded-b-none rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-6"
            onClick={e => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-reg-title"
          >
            <h2 id="delete-reg-title" className="text-lg font-bold tracking-tight text-slate-900">
              Delete this registration?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <strong className="text-slate-900">{deleteTarget.attendee?.name || 'This attendee'}</strong>
              {deleteTarget.attendee?.email ? ` (${deleteTarget.attendee.email})` : ''} will be hidden from
              registrations, check-in and exports, and their seat will be freed for someone else.
            </p>
            <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 ring-1 ring-sky-200/70">
              This can be undone — tick <strong>Show deleted</strong> in the filters and press Restore.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="ui-btn-secondary w-full disabled:opacity-50 sm:w-auto"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn-danger w-full !py-2.5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete registration'}
              </button>
            </div>
            <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-0" aria-hidden />
          </div>
        </div>
      )}

      {!selectedEvent && (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          Select an event to view registrations
        </div>
      )}

      {selectedEvent && isLoading && (
        <div className="flex justify-center py-16">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
              aria-hidden
            />
            Loading…
          </div>
        </div>
      )}

      {selectedEvent && !isLoading && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-medium text-slate-600">
                {viewMode === 'teams'
                  ? `Showing ${teamRows.length} team${teamRows.length === 1 ? '' : 's'}`
                  : `Showing ${registrations.length} of ${total} registrations`}
              </span>
              <p className="mt-0.5 text-xs text-slate-400">
                {viewMode === 'teams'
                  ? 'Click a team to open its full roster — then step through with ← / → .'
                  : 'Click a row to open full details — then step through with ← / → .'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* People / teams. Teams collapse a roster into one row so a team
                  is judged as a unit rather than as N unrelated registrants. */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                {[{ key: 'people', label: 'People' }, { key: 'teams', label: 'Teams' }].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchView(key)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      viewMode === key ? 'bg-gdg-blue text-white' : 'text-slate-500 hover:text-gdg-blue'
                    }`}
                    aria-pressed={viewMode === key}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {viewMode === 'people' && <ColumnPicker hidden={hiddenColumns} onChange={setHiddenColumns} />}
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                {['comfortable', 'compact'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDensity(mode)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                      density === mode ? 'bg-gdg-blue text-white' : 'text-slate-500 hover:text-gdg-blue'
                    }`}
                    aria-pressed={density === mode}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {/* Teams are fetched whole and paged in memory, so there is
                  nothing for a page size to control. */}
              {viewMode === 'people' && (
                <>
                  <label className="text-xs font-medium text-slate-500" htmlFor="per-page-select">Per page</label>
                  <select
                    id="per-page-select"
                    className="ui-input !w-auto !py-1.5 !px-2.5 !text-xs"
                    value={limit}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setLimit(val);
                      setPage(1);
                      setSelectedIds(new Set());
                      closeDetail();
                    }}
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={0}>All</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {viewMode === 'teams' ? (
            teamsLoading ? (
              <div className="flex justify-center py-16">
                <span className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-hidden />
                  Loading teams…
                </span>
              </div>
            ) : (
              <TeamsGrid
                rows={teamRows}
                densityCellCls={densityCellCls}
                stickyHeadCls={stickyHeadCls}
                isTeamSelected={isTeamSelected}
                onToggleTeam={toggleTeam}
                onToggleAll={toggleAllTeams}
                allSelected={allTeamsSelected}
                someSelected={someTeamsSelected}
                openTeamId={openTeam?.id ?? null}
                onOpenTeam={setOpenTeamIndex}
              />
            )
          ) : (
          <>

          <div className="ui-table-wrap max-h-[calc(100dvh-15rem)] overflow-y-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className={`${stickyHeadCls} left-0 z-30 w-10 bg-slate-50 px-3`}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded accent-gdg-blue"
                      aria-label="Select all rows on this page"
                    />
                  </th>
                  {visibleColumns.map(col => (
                    <th
                      key={col.key}
                      title={col.headerTitle}
                      onClick={col.sortable ? () => { setSortOrder(prev => (prev === 'DESC' ? 'ASC' : 'DESC')); setPage(1); closeDetail(); } : undefined}
                      aria-sort={col.sortable ? (sortOrder === 'DESC' ? 'descending' : 'ascending') : undefined}
                      className={`${stickyHeadCls} z-20 whitespace-nowrap bg-slate-50 px-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                        col.sticky ? 'left-10 z-30' : ''
                      } ${col.sortable ? 'cursor-pointer select-none transition-colors hover:text-gdg-blue' : ''}`}
                    >
                      {col.sortable ? (
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {sortOrder === 'DESC' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            )}
                          </svg>
                        </span>
                      ) : col.label}
                    </th>
                  ))}
                  {canManage && (
                    <th className={`${stickyHeadCls} z-20 whitespace-nowrap bg-slate-50 px-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500`}>
                      Actions
                    </th>
                  )}
                  <th className={`${stickyHeadCls} z-20 w-10 bg-slate-50 px-3`}>
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r, idx) => {
                  const isSelected = selectedIds.has(r.id);
                  const isActive   = openIndex === idx;
                  const a          = r.attendee || {};
                  const t          = r.team || r.team_member?.team || null;
                  const teamNumber = t?.team_number ?? r.team_number ?? null;
                  const teamName   = t?.name ?? r.team_name ?? null;
                  const teamLabel  = [teamNumber != null ? `#${teamNumber}` : null, teamName].filter(Boolean).join(' · ');
                  const isDeleted  = !!r.deleted_at;
                  const ctx = {
                    rowNumber: firstRowOnPage + idx,
                    teamLabel,
                    github:    githubUrl(a.github),
                    linkedin:  linkedinUrl(a.linkedin),
                    portfolio: externalUrl(r.portfolio_url),
                  };
                  // Deleted rows keep their own background so the sticky cells, which
                  // repaint the row background to cover the scrolled content, match.
                  const rowBg = isActive ? 'bg-sky-100/70' : isSelected ? 'bg-sky-50' : isDeleted ? 'bg-slate-50/60' : 'bg-white';
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openDetail(idx)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetail(idx);
                        }
                      }}
                      tabIndex={0}
                      aria-selected={isActive}
                      className={`group cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gdg-blue ${rowBg} ${isActive ? '' : 'hover:bg-slate-50'} ${isDeleted ? 'text-slate-400' : ''}`}
                    >
                      {/* Checkbox — sticky so it survives horizontal scrolling */}
                      <td
                        onClick={e => e.stopPropagation()}
                        className={`sticky left-0 z-10 border-b border-slate-100 px-3 ${densityCellCls} ${rowBg} ${isActive ? '' : 'group-hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(r.id)}
                          className="h-4 w-4 cursor-pointer rounded accent-gdg-blue"
                          aria-label={`Select ${a.name || 'registration'}`}
                        />
                      </td>

                      {visibleColumns.map(col => (
                        <td
                          key={col.key}
                          title={col.cellTitle?.(r) || undefined}
                          className={`border-b border-slate-100 px-3 ${densityCellCls} ${col.cellClass || ''} ${
                            col.sticky ? `sticky left-10 z-10 ${rowBg} ${isActive ? '' : 'group-hover:bg-slate-50'}` : ''
                          }`}
                        >
                          {col.render(r, ctx)}
                        </td>
                      ))}

                      {/* Delete / restore — stops propagation so it never opens the drawer */}
                      {canManage && (
                        <td
                          onClick={e => e.stopPropagation()}
                          className={`border-b border-slate-100 px-3 whitespace-nowrap ${densityCellCls}`}
                        >
                          {isDeleted ? (
                            <button
                              type="button"
                              onClick={() => handleRestore(r)}
                              disabled={restoreMutation.isPending}
                              className="ui-btn-secondary !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(r)}
                              className="ui-btn-danger !px-3 !py-1.5 text-xs"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      )}

                      {/* Open-details affordance */}
                      <td className={`border-b border-slate-100 px-3 ${densityCellCls}`}>
                        <span
                          className="inline-flex text-slate-300 transition-colors group-hover:text-gdg-blue group-focus-visible:text-gdg-blue"
                          title="View full details"
                          aria-hidden
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {registrations.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length + (canManage ? 3 : 2)} className="py-8 text-center text-sm text-slate-500">
                      No registrations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {limit !== 0 && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="ui-btn-secondary !px-3 !py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="ui-btn-secondary !px-3 !py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
          </>
          )}
        </>
      )}

      {viewMode === 'teams' && teamDrawerRegistration && (
        <RegistrationDetailDrawer
          key={openTeam.id}
          registration={teamDrawerRegistration}
          initialTab="team"
          index={openTeamIndex ?? 0}
          total={teamRows.length}
          positionLabel={`Team ${(openTeamIndex ?? 0) + 1} of ${teamRows.length}`}
          onClose={closeTeamDetail}
          onPrev={() => setOpenTeamIndex(i => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setOpenTeamIndex(i => Math.min(teamRows.length - 1, (i ?? 0) + 1))}
          hasPrev={hasPrevTeam}
          hasNext={hasNextTeam}
          onStatusChange={handleTeamStatusChange}
          statusScopeNote={`Applies to all ${openTeam.memberIds.length} members`}
          statusPending={bulkUpdateMutation.isPending}
          isSelected={isTeamSelected(openTeam)}
          onToggleSelect={() => toggleTeam(openTeam)}
        />
      )}

      {viewMode === 'people' && detailOpen && (
        <RegistrationDetailDrawer
          registration={detailRegistration}
          index={openIndex ?? 0}
          total={total}
          positionLabel={
            openIndex == null
              ? 'Loading…'
              : `Record ${firstRowOnPage + openIndex} of ${total}`
          }
          onClose={closeDetail}
          onPrev={goPrevRecord}
          onNext={goNextRecord}
          hasPrev={hasPrevRecord}
          hasNext={hasNextRecord}
          onStatusChange={handleStatusChange}
          statusPending={updateStatusMutation.isPending}
          isSelected={detailRegistration ? selectedIds.has(detailRegistration.id) : false}
          onToggleSelect={toggleOne}
        />
      )}
    </div>
  );
}
