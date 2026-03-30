import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminWorkshops } from '../../workshop-management/admin-workshop-repository';
import { useAdminRegistrations, useUpdateRegistrationStatus, useBulkUpdateStatus } from '../admin-registration-repository';
import { adminRegistrationApi } from '../admin-registration-api';
import {
  STATUS_COLORS,
  STATUS_BUTTON_COLORS,
  STATUS_LABELS,
  STATUS_FILTER_OPTIONS,
  BULK_STATUSES,
  ALL_STATUSES,
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
  status: '',
  defines_you_best: '',
  gender: '',
  university_org: '',
  checked_in: '',
  acknowledged: '',
};

export default function RegistrationsViewer() {
  const { data: workshops } = useAdminWorkshops();
  const [selectedWorkshop, setSelectedWorkshop] = useState('');

  // draft = what user is editing; applied = what is sent to API
  const [draftFilters, setDraftFilters]     = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const [page, setPage]           = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const updateStatusMutation = useUpdateRegistrationStatus();
  const bulkUpdateMutation   = useBulkUpdateStatus();

  const hasDraftChanges    = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const activeAppliedCount = Object.values(appliedFilters).filter(v => v !== '').length;
  const activeDraftCount   = Object.values(draftFilters).filter(v => v !== '').length;

  const params = {
    name:            appliedFilters.name            || undefined,
    email:           appliedFilters.email           || undefined,
    phone:           appliedFilters.phone           || undefined,
    cnic:            appliedFilters.cnic            || undefined,
    status:          appliedFilters.status          || undefined,
    defines_you_best:appliedFilters.defines_you_best|| undefined,
    gender:          appliedFilters.gender          || undefined,
    university_org:  appliedFilters.university_org  || undefined,
    checked_in:      appliedFilters.checked_in !== '' ? appliedFilters.checked_in === 'true' : undefined,
    acknowledged:
      appliedFilters.acknowledged !== '' ? appliedFilters.acknowledged === 'true' : undefined,
    page,
    limit: 20,
  };

  const { data: result, isLoading } = useAdminRegistrations(selectedWorkshop, params);
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

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      toast.success(`Status → ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleExport = async () => {
    if (!selectedWorkshop) return;
    try {
      const blob = await adminRegistrationApi.exportCsv(selectedWorkshop);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `registrations-${selectedWorkshop}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15 bg-white";
  const labelCls = "block text-xs font-semibold text-gdg-gray uppercase tracking-wide mb-1.5";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gdg-dark">Registrations</h1>
        <p className="text-gdg-gray mt-1">View, filter, and manage registrations per workshop</p>
      </div>

      {/* Workshop selector */}
      <div className="flex items-end gap-3 mb-5">
        <div className="flex-1 max-w-sm">
          <label className={labelCls}>Workshop</label>
          <select
            className={inputCls}
            value={selectedWorkshop}
            onChange={e => { setSelectedWorkshop(e.target.value); setPage(1); setSelectedIds(new Set()); }}
          >
            <option value="">Select a workshop</option>
            {workshops?.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
        </div>
        {selectedWorkshop && (
          <button
            className="px-5 py-2 border-2 border-gdg-border rounded-lg text-sm font-semibold text-gdg-gray hover:border-gdg-blue hover:text-gdg-blue"
            onClick={handleExport}
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Filters panel */}
      {selectedWorkshop && (
        <div className="bg-gdg-light-gray border border-gdg-border rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gdg-dark">
              Filters
              {activeAppliedCount > 0 && (
                <span className="ml-2 bg-gdg-blue text-white text-xs font-semibold rounded-full px-2 py-0.5">
                  {activeAppliedCount} active
                </span>
              )}
            </span>
            {(activeDraftCount > 0 || activeAppliedCount > 0) && (
              <button onClick={clearAllFilters} className="text-xs font-semibold text-gdg-red hover:underline">
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
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
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={draftFilters.status} onChange={e => setDraftFilter('status', e.target.value)}>
                <option value="">All Statuses</option>
                {STATUS_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Profile</label>
              <select className={inputCls} value={draftFilters.defines_you_best} onChange={e => setDraftFilter('defines_you_best', e.target.value)}>
                <option value="">All Profiles</option>
                <option value="Student">Student</option>
                <option value="Young Professional">Young Professional</option>
                <option value="Intermediate Expert">Intermediate Expert</option>
                <option value="Senior Expert">Senior Expert</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select className={inputCls} value={draftFilters.gender} onChange={e => setDraftFilter('gender', e.target.value)}>
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
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
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={applyFilters}
              disabled={!hasDraftChanges}
              className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${hasDraftChanges ? 'bg-gdg-blue hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              Apply Filters
            </button>
            {hasDraftChanges && (
              <span className="text-xs text-gdg-gray italic">Unapplied changes — click Apply to refresh results</span>
            )}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-gdg-dark text-white rounded-xl px-4 py-3 mb-4 flex-wrap">
          <span className="text-sm font-semibold">{selectedIds.size} selected</span>
          <span className="text-white/30 hidden sm:block">|</span>
          <span className="text-xs text-white/60">Set status:</span>
          {BULK_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => handleBulkUpdate(s)}
              disabled={bulkUpdateMutation.isPending}
              className={`px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50 ${STATUS_BUTTON_COLORS[s]}`}
            >
              {STATUS_LABELS[s] ?? s}
            </button>
          ))}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-white/50 hover:text-white"
          >
            Deselect all
          </button>
        </div>
      )}

      {!selectedWorkshop && (
        <div className="text-center py-16 text-gdg-gray">Select a workshop to view registrations</div>
      )}

      {selectedWorkshop && isLoading && (
        <div className="flex justify-center items-center py-16 text-gdg-gray">Loading...</div>
      )}

      {selectedWorkshop && !isLoading && (
        <>
          <div className="text-sm text-gdg-gray mb-3">
            Showing {registrations.length} of {total} registrations
          </div>

          <div className="bg-white rounded-xl border border-gdg-border overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gdg-light-gray">
                  <th className="py-3 px-3 border-b border-gdg-border w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded cursor-pointer accent-gdg-blue"
                    />
                  </th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">#</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">Name</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">Email</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">Phone</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">CNIC</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">Gender</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">University / Org</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">GitHub</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">LinkedIn</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">Motivation</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">Registered</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left py-3 px-3 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide whitespace-nowrap">Ack</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r, idx) => {
                  const allowed    = ALL_STATUSES.filter(s => s !== r.status);
                  const isSelected = selectedIds.has(r.id);
                  const a          = r.attendee || {};
                  return (
                    <tr key={r.id} className={`hover:bg-gdg-light-gray ${isSelected ? 'bg-blue-50' : ''}`}>

                      {/* Checkbox */}
                      <td className="py-2.5 px-3 border-b border-gdg-border">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(r.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-gdg-blue"
                        />
                      </td>

                      {/* Row number */}
                      <td className="py-2.5 px-3 border-b border-gdg-border text-gdg-gray whitespace-nowrap">
                        {(page - 1) * 20 + idx + 1}
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-3 border-b border-gdg-border font-medium whitespace-nowrap">{a.name || '—'}</td>

                      {/* Email */}
                      <td className="py-2.5 px-3 border-b border-gdg-border whitespace-nowrap">{a.email || '—'}</td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 border-b border-gdg-border whitespace-nowrap">{a.phone || '—'}</td>

                      {/* CNIC */}
                      <td className="py-2.5 px-3 border-b border-gdg-border whitespace-nowrap">{a.cnic || '—'}</td>

                      {/* Gender */}
                      <td className="py-2.5 px-3 border-b border-gdg-border whitespace-nowrap">{a.gender || '—'}</td>

                      {/* University / Org */}
                      <td className="py-2.5 px-3 border-b border-gdg-border max-w-[160px] truncate" title={a.university_org}>
                        {a.university_org || '—'}
                      </td>

                      {/* GitHub */}
                      <td className="py-2.5 px-3 border-b border-gdg-border whitespace-nowrap">
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
                      <td className="py-2.5 px-3 border-b border-gdg-border whitespace-nowrap">
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
                      <td className="py-2.5 px-3 border-b border-gdg-border max-w-[200px]">
                        <span className="block truncate" title={r.motivation}>{r.motivation || '—'}</span>
                      </td>

                      {/* Registered At */}
                      <td className="py-2.5 px-3 border-b border-gdg-border whitespace-nowrap text-gdg-gray">
                        {formatDate(r.registered_at)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 border-b border-gdg-border whitespace-nowrap">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-b border-gdg-border whitespace-nowrap text-gdg-gray" title="User confirmed via shortlisted email">
                        {r.acknowledged ? '✓' : '—'}
                      </td>
                    </tr>
                  );
                })}
                {registrations.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center text-gdg-gray py-8">No registrations found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gdg-border rounded-lg text-sm disabled:opacity-40">Previous</button>
              <span className="text-sm text-gdg-gray">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gdg-border rounded-lg text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
