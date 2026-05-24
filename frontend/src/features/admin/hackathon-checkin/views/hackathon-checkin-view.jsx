import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../../axios-instance';
import { useAdminEvents } from '../../event-management/admin-event-repository';
import { checkinApi } from '../../checkin/checkin-api';
import { useToggleCheckin } from '../../checkin/checkin-repository';
import { useHackathonCheckin, useTeams } from '../../teams/teams-repository';

export default function HackathonCheckinView() {
  const params = useParams();
  const { data: events } = useAdminEvents();
  const eventList = Array.isArray(events) ? events : events?.data || [];
  const hackathons = eventList.filter((e) => e.event_type?.slug === 'hackathon');

  const [selectedEvent, setSelectedEvent] = useState(params.eventId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [allAttendees, setAllAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastAssignment, setLastAssignment] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanLookup, setScanLookup] = useState(false);
  const html5QrRef = useRef(null);

  const toggleMutation = useToggleCheckin();
  const hackathonCheckin = useHackathonCheckin(selectedEvent);
  const { data: teams } = useTeams(selectedEvent);

  const currentEvent = eventList.find((e) => e.id === selectedEvent);

  const loadAttendees = useCallback(async (eventId) => {
    if (!eventId) {
      setAllAttendees([]);
      return;
    }
    setLoading(true);
    try {
      const data = await checkinApi.getAll(eventId);
      setAllAttendees(data);
    } catch {
      toast.error('Failed to load attendees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendees(selectedEvent);
  }, [selectedEvent, loadAttendees]);

  const handleHackathonCheckin = async (registration) => {
    try {
      const isCheckedIn = registration.checked_in ?? registration.checkedIn;
      if (!isCheckedIn) {
        await toggleMutation.mutateAsync(registration.id);
      }
      const result = await hackathonCheckin.mutateAsync(registration.id);
      setAllAttendees((prev) =>
        prev.map((r) => (r.id === registration.id ? { ...r, checked_in: true, checkedIn: true } : r)),
      );
      setLastAssignment({
        attendee: registration.attendee,
        team: result.team,
        isNewTeam: result.isNewTeam,
        roleBucket: result.roleBucket,
      });
      toast.success(`Assigned to Team ${result.team?.team_number ?? '—'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  };

  const stopScanner = useCallback(async () => {
    if (html5QrRef.current) {
      await html5QrRef.current.stop().catch(() => {});
      html5QrRef.current.clear();
      html5QrRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleQrScan = async (qrData) => {
    setScanLookup(true);
    try {
      const res = await api.post('/admin/qr-scan', { qr_data: qrData });
      const registration = allAttendees.find((r) => r.id === res.data.registrationId);
      if (!registration) {
        toast.error('This attendee is not registered for the selected hackathon');
        return;
      }
      await handleHackathonCheckin(registration);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid QR code');
    } finally {
      setScanLookup(false);
    }
  };

  const startScanner = async () => {
    if (!selectedEvent) {
      toast.error('Select a hackathon event first');
      return;
    }
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (html5QrRef.current) {
        await html5QrRef.current.stop().catch(() => {});
      }
      const html5QrCode = new Html5Qrcode('hc-qr-reader');
      html5QrRef.current = html5QrCode;
      setScanning(true);
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopScanner();
          handleQrScan(decodedText);
        },
        () => {},
      );
    } catch {
      toast.error('Camera access denied or not available');
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
        html5QrRef.current.clear();
        html5QrRef.current = null;
      }
    };
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const results = query
    ? allAttendees.filter((r) => {
        const name = (r.attendee?.name || '').toLowerCase();
        const email = (r.attendee?.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      })
    : allAttendees;

  const checkedInCount = allAttendees.filter((r) => r.checked_in ?? r.checkedIn).length;
  const totalCount = allAttendees.length;
  const teamsFormed = teams?.length ?? 0;

  return (
    <div>
      <div className="admin-page-head">
        <h1>Hackathon check-in</h1>
        <p>Marks attendees present and auto-assigns them to a balanced team.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="max-w-xs flex-1">
          <label className="ui-label" htmlFor="hc-event">Hackathon event</label>
          <select id="hc-event" className="ui-input max-w-md" value={selectedEvent} onChange={(e) => { setSelectedEvent(e.target.value); setSearchQuery(''); setLastAssignment(null); }}>
            <option value="">Select hackathon</option>
            {hackathons.map((w) => (
              <option key={w.id} value={w.id}>{w.title}</option>
            ))}
          </select>
        </div>
        {selectedEvent && (
          <div className="min-w-[12rem] flex-1">
            <label className="ui-label" htmlFor="hc-q">Filter</label>
            <input id="hc-q" className="ui-input" placeholder="Filter by name or email…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        )}
        {selectedEvent && (
          <Link to={`/admin/teams/${selectedEvent}`} className="ui-btn-secondary no-underline">View teams →</Link>
        )}
      </div>

      {selectedEvent && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="ui-card-quiet p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checked in</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{checkedInCount}<span className="text-base font-normal text-slate-400"> / {totalCount}</span></div>
          </div>
          <div className="ui-card-quiet p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teams formed</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{teamsFormed}</div>
          </div>
          <div className="ui-card-quiet p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900" title={currentEvent?.title}>{currentEvent?.title || '—'}</div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="ui-card mb-6 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Scan to check in</h2>
              <p className="mt-0.5 text-sm text-slate-500">Scan a participant QR code to check in and auto-assign a team.</p>
            </div>
            {!scanning ? (
              <button type="button" className="ui-btn-primary" onClick={startScanner} disabled={scanLookup}>
                {scanLookup ? 'Assigning…' : 'Start scanner'}
              </button>
            ) : (
              <button type="button" className="ui-btn-danger" onClick={stopScanner}>
                Stop scanner
              </button>
            )}
          </div>
          <div id="hc-qr-reader" className={`mt-4 w-full overflow-hidden rounded-xl ring-1 ring-slate-200 ${scanning ? '' : 'hidden'}`} />
        </div>
      )}

      {lastAssignment && (
        <div className="ui-card mb-6 border-emerald-200/80 bg-emerald-50/30 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Just assigned</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {lastAssignment.attendee?.name} → Team {lastAssignment.team?.team_number}{lastAssignment.isNewTeam && ' (new team)'}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Role bucket: <strong>{lastAssignment.roleBucket}</strong>
            {lastAssignment.team?.primary_domain && (
              <> · Domain: <strong>{lastAssignment.team.primary_domain}</strong></>
            )}
            {lastAssignment.team?.members && (
              <> · Members: <strong>{lastAssignment.team.members.length}</strong></>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-hidden />
        </div>
      )}

      {selectedEvent && !loading && results.length > 0 && (
        <div className="ui-table-wrap">
          <table className="ui-table min-w-[44rem]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Domain</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const isCheckedIn = r.checked_in ?? r.checkedIn;
                return (
                  <tr key={r.id}>
                    <td className="font-semibold text-slate-900">{r.attendee?.name}</td>
                    <td>{r.attendee?.email}</td>
                    <td className="max-w-[10rem] truncate" title={r.attendee?.best_describes_you}>{r.attendee?.best_describes_you || '—'}</td>
                    <td className="max-w-[14rem] truncate" title={r.domain}>{r.domain || '—'}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${isCheckedIn ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70'}`}>
                        {isCheckedIn ? 'Checked in' : 'Not checked in'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={hackathonCheckin.isPending}
                        className="rounded-xl bg-gdg-green px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 disabled:opacity-60"
                        onClick={() => handleHackathonCheckin(r)}
                      >
                        Check in + assign team
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedEvent && !loading && results.length === 0 && (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          {query ? 'No attendees match your filter' : 'No attendees registered for this hackathon'}
        </div>
      )}

      {!selectedEvent && (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          Select a hackathon event to begin check-in
        </div>
      )}
    </div>
  );
}
