import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAdminWorkshops } from '../../workshop-management/admin-workshop-repository';
import { checkinApi } from '../checkin-api';
import { useToggleCheckin } from '../checkin-repository';

export default function CheckinView() {
  const { data: workshops } = useAdminWorkshops();
  const toggleMutation = useToggleCheckin();

  const [selectedWorkshop, setSelectedWorkshop] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allAttendees, setAllAttendees] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAttendees = useCallback(async (workshopId) => {
    if (!workshopId) {
      setAllAttendees([]);
      return;
    }
    setLoading(true);
    try {
      const data = await checkinApi.getAll(workshopId);
      setAllAttendees(data);
    } catch {
      toast.error('Failed to load attendees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendees(selectedWorkshop);
  }, [selectedWorkshop, loadAttendees]);

  const handleToggle = async registrationId => {
    try {
      const updated = await toggleMutation.mutateAsync(registrationId);
      setAllAttendees(prev =>
        prev.map(r =>
          r.id === registrationId ? { ...r, checked_in: updated.checked_in, checkedIn: updated.checked_in } : r
        )
      );
      toast.success(updated.checked_in ? 'Checked in!' : 'Check-in removed');
    } catch {
      toast.error('Failed to update check-in');
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const results = query
    ? allAttendees.filter(r => {
        const name = (r.attendee?.name || '').toLowerCase();
        const email = (r.attendee?.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      })
    : allAttendees;

  const totalCount = allAttendees.length;
  const checkedInCount = allAttendees.filter(r => r.checked_in ?? r.checkedIn).length;

  const inputCls = 'ui-input';

  return (
    <div>
      <div className="admin-page-head">
        <h1>Day-of check-in</h1>
        <p>Select a workshop to see all attendees. Use search to filter by name or email.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="max-w-xs flex-1">
          <label className="ui-label" htmlFor="checkin-workshop">
            Workshop
          </label>
          <select
            id="checkin-workshop"
            className={`${inputCls} max-w-md`}
            value={selectedWorkshop}
            onChange={e => {
              setSelectedWorkshop(e.target.value);
              setSearchQuery('');
            }}
          >
            <option value="">Select workshop</option>
            {workshops?.map(w => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>
        {selectedWorkshop && (
          <div className="min-w-[12rem] flex-1">
            <label className="ui-label" htmlFor="checkin-q">
              Filter
            </label>
            <input
              id="checkin-q"
              className={inputCls}
              placeholder="Filter by name or email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {selectedWorkshop && !loading && (
        <div className="mb-4 text-sm font-medium text-slate-600">
          Checked in: <span className="tabular-nums text-slate-900">{checkedInCount}</span> /{' '}
          <span className="tabular-nums">{totalCount}</span>
          {query && (
            <span className="ml-3 text-slate-400">
              (showing {results.length} matching)
            </span>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
              aria-hidden
            />
            Loading attendees…
          </div>
        </div>
      )}

      {selectedWorkshop && !loading && results.length > 0 && (
        <div className="ui-table-wrap">
          <table className="ui-table min-w-[36rem]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Organization</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const isCheckedIn = r.checked_in ?? r.checkedIn;
                return (
                  <tr key={r.id}>
                    <td className="font-semibold text-slate-900">{r.attendee?.name}</td>
                    <td>{r.attendee?.email}</td>
                    <td className="max-w-[12rem] truncate" title={r.attendee?.university_org}>
                      {r.attendee?.university_org ?? r.attendee?.universityOrg}
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isCheckedIn
                            ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70'
                            : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70'
                        }`}
                      >
                        {isCheckedIn ? 'Checked in' : 'Not checked in'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={
                          isCheckedIn
                            ? 'ui-btn-secondary !px-3 !py-1.5 text-xs'
                            : 'rounded-xl bg-gdg-green px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600'
                        }
                        onClick={() => handleToggle(r.id)}
                      >
                        {isCheckedIn ? 'Undo' : 'Check in'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedWorkshop && !loading && results.length === 0 && (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          {query ? 'No attendees match your filter' : 'No attendees registered for this workshop'}
        </div>
      )}

      {!selectedWorkshop && (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          Select a workshop to view and check in attendees
        </div>
      )}
    </div>
  );
}
