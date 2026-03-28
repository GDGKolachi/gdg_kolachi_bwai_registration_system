import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminWorkshops } from '../../workshop-management/admin-workshop-repository';
import { useAdminRegistrations, useUpdateRegistrationStatus, useBulkUpdateStatus } from '../admin-registration-repository';
import { adminRegistrationApi } from '../admin-registration-api';

const STATUS_COLORS = {
  // current
  pending:     'bg-yellow-100 text-amber-600',
  confirm:     'bg-blue-100 text-gdg-blue',
  shortlist:   'bg-purple-100 text-purple-700',
  reject:      'bg-red-100 text-gdg-red',
  'check-in':  'bg-green-100 text-gdg-green',
  // legacy (old DB values)
  shortlisted: 'bg-purple-100 text-purple-700',
  attended:    'bg-green-100 text-gdg-green',
  rejected:    'bg-red-100 text-gdg-red',
};

const STATUS_BUTTON_COLORS = {
  confirm:   'bg-gdg-blue text-white hover:bg-blue-600',
  shortlist: 'bg-purple-600 text-white hover:bg-purple-700',
  'check-in':'bg-gdg-green text-white hover:bg-green-600',
  reject:    'bg-gdg-red text-white hover:bg-red-600',
};

const STATUS_TRANSITIONS = {
  // current
  pending:   ['confirm', 'shortlist', 'reject'],
  confirm:   ['check-in'],
  shortlist: ['check-in', 'reject'],
  // legacy (old DB values)
  shortlisted: ['check-in', 'reject'],
};

const BULK_STATUSES = ['confirm', 'shortlist', 'reject', 'check-in'];

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
                <option value="pending">Pending</option>
                <option value="confirm">Confirm</option>
                <option value="shortlist">Shortlist</option>
                <option value="reject">Reject</option>
                <option value="check-in">Check-in</option>
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
              <label className={labelCls}>Check-in</label>
              <select className={inputCls} value={draftFilters.checked_in} onChange={e => setDraftFilter('checked_in', e.target.value)}>
                <option value="">All</option>
                <option value="true">Checked In</option>
                <option value="false">Not Checked In</option>
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
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize disabled:opacity-50 ${STATUS_BUTTON_COLORS[s]}`}
            >
              {s}
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
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="py-3 px-4 border-b border-gdg-border w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded cursor-pointer accent-gdg-blue"
                    />
                  </th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Name</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Email</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Phone</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">CNIC</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Profile</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map(r => {
                  const allowed    = STATUS_TRANSITIONS[r.status] || [];
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <tr key={r.id} className={`hover:bg-gdg-light-gray ${isSelected ? 'bg-blue-50' : ''}`}>
                      <td className="py-3 px-4 border-b border-gdg-border">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(r.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-gdg-blue"
                        />
                      </td>
                      <td className="py-3 px-4 border-b border-gdg-border font-medium">{r.attendee?.name}</td>
                      <td className="py-3 px-4 border-b border-gdg-border text-sm">{r.attendee?.email}</td>
                      <td className="py-3 px-4 border-b border-gdg-border text-sm">{r.attendee?.phone}</td>
                      <td className="py-3 px-4 border-b border-gdg-border text-sm">{r.attendee?.cnic}</td>
                      <td className="py-3 px-4 border-b border-gdg-border text-sm">{r.attendee?.defines_you_best || '-'}</td>
                      <td className="py-3 px-4 border-b border-gdg-border">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-b border-gdg-border">
                        <div className="flex gap-1.5 flex-wrap">
                          {allowed.map(next => (
                            <button
                              key={next}
                              onClick={() => handleStatusChange(r.id, next)}
                              disabled={updateStatusMutation.isPending}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize disabled:opacity-50 ${STATUS_BUTTON_COLORS[next] || 'bg-gray-200 text-gray-700'}`}
                            >
                              {next}
                            </button>
                          ))}
                          {allowed.length === 0 && <span className="text-xs text-gdg-gray">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {registrations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-gdg-gray py-8">No registrations found</td>
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
