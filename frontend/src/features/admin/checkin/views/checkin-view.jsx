import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminWorkshops } from '../../workshop-management/admin-workshop-repository';
import { checkinApi } from '../checkin-api';
import { useToggleCheckin } from '../checkin-repository';

export default function CheckinView() {
  const { data: workshops } = useAdminWorkshops();
  const toggleMutation = useToggleCheckin();

  const [selectedWorkshop, setSelectedWorkshop] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!selectedWorkshop || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await checkinApi.search(selectedWorkshop, searchQuery);
      setResults(data);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleToggle = async registrationId => {
    try {
      const updated = await toggleMutation.mutateAsync(registrationId);
      setResults(prev =>
        prev.map(r =>
          r.id === registrationId ? { ...r, checked_in: updated.checked_in, checkedIn: updated.checked_in } : r
        )
      );
      toast.success(updated.checked_in ? 'Checked in!' : 'Check-in removed');
    } catch {
      toast.error('Failed to update check-in');
    }
  };

  const checkedInCount = results.filter(r => r.checked_in ?? r.checkedIn).length;

  const inputCls = 'ui-input';

  return (
    <div>
      <div className="admin-page-head">
        <h1>Day-of check-in</h1>
        <p>Search attendees by name or email and toggle check-in for the selected workshop.</p>
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
              setResults([]);
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
        <div className="min-w-[12rem] flex-1">
          <label className="ui-label" htmlFor="checkin-q">
            Search
          </label>
          <input
            id="checkin-q"
            className={inputCls}
            placeholder="Name or email…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          type="button"
          className="ui-btn-primary"
          onClick={handleSearch}
          disabled={searching}
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mb-4 text-sm font-medium text-slate-600">
          Checked in: <span className="tabular-nums text-slate-900">{checkedInCount}</span> /{' '}
          <span className="tabular-nums">{results.length}</span>
        </div>
      )}

      {results.length > 0 && (
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

      {!selectedWorkshop && (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          Select a workshop and search for attendees to check in
        </div>
      )}
    </div>
  );
}
