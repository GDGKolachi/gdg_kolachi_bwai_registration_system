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

  const inputCls = "px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gdg-dark">Day-of Check-in</h1>
        <p className="text-gdg-gray mt-2">Search attendees and mark them as checked in</p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <select className={`${inputCls} max-w-xs`} value={selectedWorkshop} onChange={e => { setSelectedWorkshop(e.target.value); setResults([]); }}>
          <option value="">Select workshop</option>
          {workshops?.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
        <input className={`${inputCls} flex-1 max-w-xs`} placeholder="Search by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <button className="py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-60" onClick={handleSearch} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mb-4 text-sm text-gdg-gray">
          Checked in: <strong>{checkedInCount}</strong> / {results.length}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gdg-border overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Name</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Email</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Organization</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const isCheckedIn = r.checked_in ?? r.checkedIn;
                return (
                  <tr key={r.id} className="hover:bg-gdg-light-gray">
                    <td className="py-3 px-4 border-b border-gdg-border font-medium">{r.attendee?.name}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">{r.attendee?.email}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">{r.attendee?.university_org ?? r.attendee?.universityOrg}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${isCheckedIn ? 'bg-green-100 text-gdg-green' : 'bg-yellow-100 text-amber-600'}`}>
                        {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b border-gdg-border">
                      <button className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${isCheckedIn ? 'border-2 border-gdg-border text-gdg-gray hover:border-gdg-blue hover:text-gdg-blue' : 'bg-gdg-green text-white hover:bg-green-600'}`} onClick={() => handleToggle(r.id)}>
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
        <div className="text-center py-16 text-gdg-gray">
          Select a workshop and search for attendees to check in
        </div>
      )}
    </div>
  );
}
