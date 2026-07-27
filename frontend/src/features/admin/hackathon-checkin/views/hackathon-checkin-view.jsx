import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../../axios-instance';
import { useAdminEvents } from '../../event-management/admin-event-repository';
import { checkinApi } from '../../checkin/checkin-api';
import { useToggleCheckin } from '../../checkin/checkin-repository';
import { useHackathonCheckin, useHackathonUnassign, useTeams } from '../../teams/teams-repository';

const PAGE_SIZE = 10;
const ELIGIBLE_STATUSES = new Set(['shortlisted', 'confirmed', 'attended']);

const STATUS_COLORS = {
  shortlisted: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  confirmed: 'bg-violet-50 text-violet-900 ring-1 ring-violet-200/70',
  attended: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  pending: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
  rejected: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
};

export default function HackathonCheckinView() {
  const params = useParams();
  const { data: events } = useAdminEvents();
  const eventList = Array.isArray(events) ? events : events?.data || [];
  const hackathons = eventList.filter((e) => e.event_type?.slug === 'hackathon');

  const [selectedEvent, setSelectedEvent] = useState(params.eventId || '');
  const [nameQuery, setNameQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [page, setPage] = useState(1);
  const [allAttendees, setAllAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastAssignment, setLastAssignment] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanLookup, setScanLookup] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const html5QrRef = useRef(null);

  const toggleMutation = useToggleCheckin();
  const hackathonCheckin = useHackathonCheckin(selectedEvent);
  const hackathonUnassign = useHackathonUnassign(selectedEvent);
  const { data: teams, refetch: refetchTeams } = useTeams(selectedEvent);

  const currentEvent = eventList.find((e) => e.id === selectedEvent);

  // registration_id -> team
  const teamByRegistration = useMemo(() => {
    const map = new Map();
    for (const t of teams || []) {
      for (const m of t.members || []) {
        if (m.registration_id) map.set(m.registration_id, t);
      }
    }
    return map;
  }, [teams]);

  const loadAttendees = useCallback(async (eventId) => {
    if (!eventId) { setAllAttendees([]); return; }
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

  useEffect(() => { loadAttendees(selectedEvent); }, [selectedEvent, loadAttendees]);

  // Reset page + selection when filters/event change
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [selectedEvent, nameQuery, teamFilter]);

  // ── Single check-in ──────────────────────────────────────────────────────
  const handleHackathonCheckin = async (registration) => {
    try {
      const isCheckedIn = registration.checked_in ?? registration.checkedIn;
      if (!isCheckedIn) await toggleMutation.mutateAsync(registration.id);
      const result = await hackathonCheckin.mutateAsync(registration.id);
      setAllAttendees((prev) =>
        prev.map((r) =>
          r.id === registration.id ? { ...r, checked_in: true, checkedIn: true, status: 'attended' } : r,
        ),
      );
      setLastAssignment({ attendee: registration.attendee, team: result.team, isNewTeam: result.isNewTeam, roleBucket: result.roleBucket });
      toast.success(`Assigned to Team ${result.team?.team_number ?? '—'}`);
      refetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  };

  // ── Bulk check-in ────────────────────────────────────────────────────────
  const handleBulkCheckin = async () => {
    const toProcess = pageRows.filter(
      (r) => selectedIds.has(r.id) && !teamByRegistration.has(r.id),
    );
    if (toProcess.length === 0) {
      toast.error('No unassigned members selected');
      return;
    }
    setBulkPending(true);
    let successCount = 0;
    let lastResult = null;
    for (const registration of toProcess) {
      try {
        const isCheckedIn = registration.checked_in ?? registration.checkedIn;
        if (!isCheckedIn) await toggleMutation.mutateAsync(registration.id);
        const result = await hackathonCheckin.mutateAsync(registration.id);
        setAllAttendees((prev) =>
          prev.map((r) =>
            r.id === registration.id ? { ...r, checked_in: true, checkedIn: true, status: 'attended' } : r,
          ),
        );
        lastResult = { attendee: registration.attendee, team: result.team, isNewTeam: result.isNewTeam, roleBucket: result.roleBucket };
        successCount++;
      } catch (err) {
        toast.error(`${registration.attendee?.name}: ${err.response?.data?.message || 'Assignment failed'}`);
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} member${successCount > 1 ? 's' : ''} checked in & assigned`);
      if (lastResult) setLastAssignment(lastResult);
      refetchTeams();
    }
    setSelectedIds(new Set());
    setBulkPending(false);
  };

  const handleBulkUnassign = async () => {
    const toProcess = pageRows.filter(
      (r) => selectedIds.has(r.id) && teamByRegistration.has(r.id),
    );
    if (toProcess.length === 0) { toast.error('No assigned members selected'); return; }
    setBulkPending(true);
    let successCount = 0;
    for (const registration of toProcess) {
      try {
        await hackathonUnassign.mutateAsync(registration.id);
        setAllAttendees((prev) =>
          prev.map((r) =>
            r.id === registration.id ? { ...r, checked_in: false, checkedIn: false, status: 'shortlisted' } : r,
          ),
        );
        if (lastAssignment?.attendee?.email === registration.attendee?.email) setLastAssignment(null);
        successCount++;
      } catch (err) {
        toast.error(`${registration.attendee?.name}: ${err.response?.data?.message || 'Unassign failed'}`);
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} member${successCount > 1 ? 's' : ''} unassigned`);
      refetchTeams();
    }
    setSelectedIds(new Set());
    setBulkPending(false);
  };

  const handleUnassign = async (registration) => {
    if (!confirm(`Unassign ${registration.attendee?.name} from their team and undo check-in?`)) return;
    try {
      await hackathonUnassign.mutateAsync(registration.id);
      setAllAttendees((prev) =>
        prev.map((r) =>
          r.id === registration.id ? { ...r, checked_in: false, checkedIn: false, status: 'shortlisted' } : r,
        ),
      );
      if (lastAssignment?.attendee?.email === registration.attendee?.email) setLastAssignment(null);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(registration.id); return next; });
      toast.success('Unassigned');
      refetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unassign failed');
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
      if (!registration) { toast.error('This attendee is not registered for the selected hackathon'); return; }
      if (!ELIGIBLE_STATUSES.has(registration.status)) { toast.error(`Cannot check in — registration is "${registration.status}".`); return; }
      await handleHackathonCheckin(registration);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid QR code');
    } finally {
      setScanLookup(false);
    }
  };

  const startScanner = async () => {
    if (!selectedEvent) { toast.error('Select a hackathon event first'); return; }
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (html5QrRef.current) await html5QrRef.current.stop().catch(() => {});
      const html5QrCode = new Html5Qrcode('hc-qr-reader');
      html5QrRef.current = html5QrCode;
      setScanning(true);
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { stopScanner(); handleQrScan(decodedText); },
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

  const eligibleAttendees = useMemo(
    () => allAttendees.filter((r) => ELIGIBLE_STATUSES.has(r.status)),
    [allAttendees],
  );

  const nameNeedle = nameQuery.trim().toLowerCase();
  const filtered = useMemo(() => {
    return eligibleAttendees.filter((r) => {
      if (nameNeedle) {
        const name = (r.attendee?.name || '').toLowerCase();
        const email = (r.attendee?.email || '').toLowerCase();
        if (!name.includes(nameNeedle) && !email.includes(nameNeedle)) return false;
      }
      if (teamFilter) {
        if (teamFilter === '__none__') { if (teamByRegistration.has(r.id)) return false; }
        else { const t = teamByRegistration.get(r.id); if (!t || t.id !== teamFilter) return false; }
      }
      return true;
    });
  }, [eligibleAttendees, nameNeedle, teamFilter, teamByRegistration]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // Checkbox helpers scoped to the current page — all rows are selectable
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const somePageSelected = pageRows.some((r) => selectedIds.has(r.id));

  const toggleRow = (id) =>
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const togglePageAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => { const next = new Set(prev); pageRows.forEach((r) => next.delete(r.id)); return next; });
    } else {
      setSelectedIds((prev) => { const next = new Set(prev); pageRows.forEach((r) => next.add(r.id)); return next; });
    }
  };

  const selectedUnassignedOnPage = pageRows.filter((r) => selectedIds.has(r.id) && !teamByRegistration.has(r.id)).length;
  const selectedAssignedOnPage   = pageRows.filter((r) => selectedIds.has(r.id) &&  teamByRegistration.has(r.id)).length;

  const checkedInCount = eligibleAttendees.filter((r) => r.checked_in ?? r.checkedIn).length;
  const totalCount = eligibleAttendees.length;
  const teamsFormed = teams?.length ?? 0;

  return (
    <div>
      <div className="admin-page-head">
        <h1>Hackathon check-in</h1>
        <p>Marks shortlisted attendees present and auto-assigns them to a balanced team.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="max-w-xs flex-1">
          <label className="ui-label" htmlFor="hc-event">Hackathon event</label>
          <select id="hc-event" className="ui-input max-w-md" value={selectedEvent}
            onChange={(e) => { setSelectedEvent(e.target.value); setNameQuery(''); setTeamFilter(''); setLastAssignment(null); }}>
            <option value="">Select hackathon</option>
            {hackathons.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
        </div>
        {selectedEvent && (
          <div className="min-w-[12rem] flex-1">
            <label className="ui-label" htmlFor="hc-q">Search by name or email</label>
            <input id="hc-q" className="ui-input" placeholder="Type a name or email…" value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)} />
          </div>
        )}
        {selectedEvent && (
          <div className="min-w-[10rem]">
            <label className="ui-label" htmlFor="hc-team">Filter by team</label>
            <select id="hc-team" className="ui-input" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
              <option value="">All teams</option>
              <option value="__none__">No team yet</option>
              {(teams || []).map((t) => <option key={t.id} value={t.id}>Team #{t.team_number}</option>)}
            </select>
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
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {checkedInCount}<span className="text-base font-normal text-slate-400"> / {totalCount}</span>
            </div>
          </div>
          <div className="ui-card-quiet p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teams formed</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{teamsFormed}</div>
          </div>
          <div className="ui-card-quiet p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900" title={currentEvent?.title}>
              {currentEvent?.title || '—'}
            </div>
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
              <button type="button" className="ui-btn-danger" onClick={stopScanner}>Stop scanner</button>
            )}
          </div>
          <div id="hc-qr-reader" className={`mt-4 mx-auto w-full max-w-xs overflow-hidden rounded-xl ring-1 ring-slate-200 ${scanning ? '' : 'hidden'}`} />
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
            {lastAssignment.team?.primary_domain && <> · Domain: <strong>{lastAssignment.team.primary_domain}</strong></>}
            {lastAssignment.team?.members && <> · Members: <strong>{lastAssignment.team.members.length}</strong></>}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-hidden />
        </div>
      )}

      {selectedEvent && !loading && pageRows.length > 0 && (
        <>
          {/* ── Bulk action bar ── */}
          {(selectedUnassignedOnPage > 0 || selectedAssignedOnPage > 0) && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/80">
              <span className="text-sm font-semibold text-slate-700">
                {[
                  selectedUnassignedOnPage > 0 && `${selectedUnassignedOnPage} unassigned`,
                  selectedAssignedOnPage   > 0 && `${selectedAssignedOnPage} assigned`,
                ].filter(Boolean).join(', ')} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="ui-btn-secondary !py-1.5 text-xs"
                  onClick={() => setSelectedIds(new Set())}>
                  Clear
                </button>
                {selectedUnassignedOnPage > 0 && (
                  <button type="button" disabled={bulkPending}
                    className="rounded-xl bg-gdg-green px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 disabled:opacity-60"
                    onClick={handleBulkCheckin}>
                    {bulkPending ? 'Processing…' : `Check in + assign (${selectedUnassignedOnPage})`}
                  </button>
                )}
                {selectedAssignedOnPage > 0 && (
                  <button type="button" disabled={bulkPending}
                    className="rounded-xl bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                    onClick={handleBulkUnassign}>
                    {bulkPending ? 'Processing…' : `Unassign (${selectedAssignedOnPage})`}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="ui-table-wrap">
            <table className="ui-table min-w-[56rem]">
              <thead>
                <tr>
                  <th className="w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all on this page"
                      checked={allPageSelected}
                      ref={(el) => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                      onChange={togglePageAll}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-gdg-blue"
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Primary skill</th>
                  <th>Domain</th>
                  <th>Registration</th>
                  <th>Check-in</th>
                  <th>Team</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const isCheckedIn = r.checked_in ?? r.checkedIn;
                  const assignedTeam = teamByRegistration.get(r.id);
                  const status = r.status || 'shortlisted';
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <tr key={r.id} className={isSelected ? 'bg-gdg-blue/5' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.attendee?.name}`}
                          checked={isSelected}
                          onChange={() => toggleRow(r.id)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-gdg-blue"
                        />
                      </td>
                      <td className="font-semibold text-slate-900">{r.attendee?.name}</td>
                      <td>{r.attendee?.email}</td>
                      <td className="max-w-[10rem] truncate" title={r.attendee?.best_describes_you}>
                        {r.attendee?.best_describes_you || '—'}
                      </td>
                      <td className="max-w-[14rem] truncate" title={r.domain}>{r.domain || '—'}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80'}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${isCheckedIn ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70'}`}>
                          {isCheckedIn ? 'Checked in' : 'Not checked in'}
                        </span>
                      </td>
                      <td>
                        {assignedTeam ? (
                          <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-900 ring-1 ring-sky-200/70">
                            Team #{assignedTeam.team_number}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        {assignedTeam ? (
                          <button type="button" disabled={hackathonUnassign.isPending}
                            className="rounded-xl bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                            onClick={() => handleUnassign(r)}>
                            Unassign
                          </button>
                        ) : (
                          <button type="button" disabled={hackathonCheckin.isPending || bulkPending}
                            className="rounded-xl bg-gdg-green px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 disabled:opacity-60"
                            onClick={() => handleHackathonCheckin(r)}>
                            Check in + assign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-slate-500">
              Showing <strong>{pageStart + 1}</strong>–<strong>{Math.min(pageStart + PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="ui-btn-secondary !px-3 !py-1 text-xs disabled:opacity-40">
                ← Prev
              </button>
              <span className="text-xs font-semibold text-slate-600">Page {safePage} of {totalPages}</span>
              <button type="button" disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="ui-btn-secondary !px-3 !py-1 text-xs disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {selectedEvent && !loading && filtered.length === 0 && (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          {nameQuery || teamFilter ? 'No attendees match your filters' : 'No shortlisted attendees for this hackathon yet'}
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
