import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminEvents, useLockAcknowledgements, useUnlockAcknowledgements } from '../../event-management/admin-event-repository';
import { useAdminRegistrations, useUpdateRegistrationStatus, useBulkUpdateStatus, useEventAmbassadors, useSendReminder, useSendRejection, useImportCsvStatus } from '../admin-registration-repository';
import { adminRegistrationApi } from '../admin-registration-api';
import {
  STATUS_COLORS,
  STATUS_BUTTON_COLORS,
  STATUS_LABELS,
  STATUS_FILTER_OPTIONS,
  BULK_STATUSES,
  ALL_STATUSES,
  VALID_TRANSITIONS,
} from '../../../../shared/constants/registration-status';
import { formatDate } from '../../../../shared/utils/formatDate';

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
  university_org: '',
  checked_in: '',
  acknowledged: '',
  date_from: '',
  date_to: '',
};

const PROFILE_OPTIONS = [
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
];

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

  // Import CSV modal state
  const importCsvMutation = useImportCsvStatus();
  const [importOpen, setImportOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importStatus, setImportStatus] = useState('confirmed');

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
    university_org:  appliedFilters.university_org  || undefined,
    checked_in:      appliedFilters.checked_in !== '' ? appliedFilters.checked_in === 'true' : undefined,
    acknowledged:
      appliedFilters.acknowledged !== '' ? appliedFilters.acknowledged === 'true' : undefined,
    date_from:       appliedFilters.date_from || undefined,
    date_to:         appliedFilters.date_to   || undefined,
    sort_by:         'registered_at',
    sort_order:      sortOrder,
    page: limit === 0 ? 1 : page,
    limit: limit === 0 ? 999999 : limit,
  };

  const { data: result, isLoading } = useAdminRegistrations(selectedEvent, params);
  const registrations = result?.data    || [];
  const totalPages    = result?.totalPages || 1;
  const total         = result?.total   || 0;

  const setDraftFilter = (key, value) => setDraftFilters(prev => ({ ...prev, [key]: value }));

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
    setSelectedIds(new Set());
  };

  const clearAllFilters = () => {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
    setSelectedIds(new Set());
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

  const openReminderModal = () => {
    if (selectedIds.size === 0) return;
    setReminderMessage('');
    setReminderOpen(true);
  };

  const openRejectionModal = () => {
    if (selectedIds.size === 0) return;
    setAlsoReject(true);
    setRejectionOpen(true);
  };

  const sendRejection = async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await sendRejectionMutation.mutateAsync({
        ids: Array.from(selectedIds),
        alsoReject,
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900">
              Filters
              {activeAppliedCount > 0 && (
                <span className="ml-2 rounded-full bg-gdg-blue px-2 py-0.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20">
                  {activeAppliedCount} active
                </span>
              )}
            </span>
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
              label="Best describes you"
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
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
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
            <span className="text-sm font-medium text-slate-600">
              Showing {registrations.length} of {total} registrations
            </span>
            <div className="flex items-center gap-2">
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
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={0}>All</option>
              </select>
            </div>
          </div>

          <div className="ui-table-wrap">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/95">
                  <th className="w-10 border-b border-slate-200 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded accent-gdg-blue"
                    />
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    #
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Name
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Email
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Phone
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    CNIC
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Gender
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    University / Org
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ambassador
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    GitHub
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    LinkedIn
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Motivation
                  </th>
                  <th
                    className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-gdg-blue transition-colors"
                    onClick={() => {
                      setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC');
                      setPage(1);
                    }}
                    title={`Sort by date (${sortOrder === 'DESC' ? 'newest first' : 'oldest first'})`}
                  >
                    <span className="inline-flex items-center gap-1">
                      Registered
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {sortOrder === 'DESC' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        )}
                      </svg>
                    </span>
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ack
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r, idx) => {
                  const isSelected = selectedIds.has(r.id);
                  const a          = r.attendee || {};
                  return (
                    <tr key={r.id} className={`transition-colors hover:bg-slate-50/90 ${isSelected ? 'bg-sky-50/70' : ''}`}>

                      {/* Checkbox */}
                      <td className="py-2.5 px-3 border-b border-slate-100">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(r.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-gdg-blue"
                        />
                      </td>

                      {/* Row number */}
                      <td className="border-b border-slate-100 py-2.5 px-3 whitespace-nowrap text-slate-600">
                        {(limit === 0 ? 0 : (page - 1) * limit) + idx + 1}
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-3 border-b border-slate-100 font-medium whitespace-nowrap">{a.name || '—'}</td>

                      {/* Email */}
                      <td className="py-2.5 px-3 border-b border-slate-100 whitespace-nowrap">{a.email || '—'}</td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 border-b border-slate-100 whitespace-nowrap">{a.phone || '—'}</td>

                      {/* CNIC */}
                      <td className="py-2.5 px-3 border-b border-slate-100 whitespace-nowrap">{a.cnic || '—'}</td>

                      {/* Gender */}
                      <td className="py-2.5 px-3 border-b border-slate-100 whitespace-nowrap">{a.gender || '—'}</td>

                      {/* University / Org */}
                      <td className="py-2.5 px-3 border-b border-slate-100 max-w-[160px] truncate" title={a.university_org}>
                        {a.university_org || '—'}
                      </td>

                      {/* Ambassador */}
                      <td className="py-2.5 px-3 border-b border-slate-100 max-w-[160px] truncate" title={r.ambassador}>
                        {r.ambassador || '—'}
                      </td>

                      {/* GitHub */}
                      <td className="py-2.5 px-3 border-b border-slate-100 whitespace-nowrap">
                        {a.github ? (
                          <a
                            href={a.github.startsWith('http') ? a.github : `https://github.com/${a.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gdg-blue hover:underline inline-flex items-center gap-0.5"
                          >
                            GitHub <ExternalLinkIcon />
                          </a>
                        ) : '—'}
                      </td>

                      {/* LinkedIn */}
                      <td className="py-2.5 px-3 border-b border-slate-100 whitespace-nowrap">
                        {a.linkedin ? (
                          <a
                            href={a.linkedin.startsWith('http') ? a.linkedin : `https://linkedin.com/in/${a.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gdg-blue hover:underline inline-flex items-center gap-0.5"
                          >
                            LinkedIn <ExternalLinkIcon />
                          </a>
                        ) : '—'}
                      </td>

                      {/* Motivation */}
                      <td className="py-2.5 px-3 border-b border-slate-100 max-w-[200px]">
                        <span className="block truncate" title={r.motivation}>{r.motivation || '—'}</span>
                      </td>

                      {/* Registered At */}
                      <td className="py-2.5 px-3 border-b border-slate-100 whitespace-nowrap text-gdg-gray">
                        {formatDate(r.registered_at)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 border-b border-slate-100 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'}`}
                        >
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-b border-slate-100 whitespace-nowrap text-gdg-gray" title="User confirmed via shortlisted email">
                        {r.acknowledged ? '✓' : '—'}
                      </td>
                    </tr>
                  );
                })}
                {registrations.length === 0 && (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-sm text-slate-500">
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
    </div>
  );
}
