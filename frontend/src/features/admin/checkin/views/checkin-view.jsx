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

  const handleToggle = async (registrationId) => {
    try {
      const updated = await toggleMutation.mutateAsync(registrationId);
      setResults(prev => prev.map(r => r.id === registrationId ? { ...r, checked_in: updated.checked_in, checkedIn: updated.checked_in } : r));
      toast.success(updated.checked_in ? 'Checked in!' : 'Check-in removed');
    } catch {
      toast.error('Failed to update check-in');
    }
  };

  const checkedInCount = results.filter(r => r.checked_in ?? r.checkedIn).length;

  return (
    <div>
      <div className="page-header">
        <h1>Day-of Check-in</h1>
        <p>Search attendees and mark them as checked in</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <select
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gdg-border)', maxWidth: 300 }}
          value={selectedWorkshop}
          onChange={e => { setSelectedWorkshop(e.target.value); setResults([]); }}
        >
          <option value="">Select workshop</option>
          {workshops?.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
        <input
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gdg-border)', flex: 1, maxWidth: 300 }}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--gdg-gray)' }}>
          Checked in: <strong>{checkedInCount}</strong> / {results.length}
        </div>
      )}

      {results.length > 0 && (
        <div className="card">
          <table>
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
                    <td style={{ fontWeight: 500 }}>{r.attendee?.name}</td>
                    <td>{r.attendee?.email}</td>
                    <td>{r.attendee?.university_org ?? r.attendee?.universityOrg}</td>
                    <td>
                      <span className={`badge ${isCheckedIn ? 'badge-approved' : 'badge-pending'}`}>
                        {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${isCheckedIn ? 'btn-outline' : 'btn-success'}`}
                        onClick={() => handleToggle(r.id)}
                      >
                        {isCheckedIn ? 'Undo' : 'Check In'}
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
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gdg-gray)' }}>
          Select a workshop and search for attendees to check in
        </div>
      )}
    </div>
  );
}
