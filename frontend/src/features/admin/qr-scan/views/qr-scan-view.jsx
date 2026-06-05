import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../../../axios-instance';

export default function QrScanView() {
  const [scanResult, setScanResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showAckWarning, setShowAckWarning] = useState(false);
  const [checkinStats, setCheckinStats] = useState(null);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  const fetchStats = async (eventId) => {
    try {
      const { data } = await api.get(`/admin/checkin-stats/${eventId}`);
      setCheckinStats(data);
    } catch { /* ignore */ }
  };

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (html5QrRef.current) {
        await html5QrRef.current.stop().catch(() => {});
      }
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrRef.current = html5QrCode;
      setScanning(true);
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        decodedText => {
          handleScan(decodedText);
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrRef.current = null;
          }).catch(() => {});
          setScanning(false);
        },
        () => {}
      );
    } catch (err) {
      toast.error('Camera access denied or not available');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      await html5QrRef.current.stop().catch(() => {});
      html5QrRef.current.clear();
      html5QrRef.current = null;
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
      setScanning(false);
    };
  }, []);

  const handleScan = async qrData => {
    setLoading(true);
    setShowAckWarning(false);
    try {
      const res = await api.post('/admin/qr-scan', { qr_data: qrData });
      setScanResult(res.data);
      if (res.data.event_id) fetchStats(res.data.event_id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid QR code');
      setScanResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = () => {
    if (!manualInput.trim()) return;
    handleScan(manualInput.trim());
  };

  const handleMarkAttended = async () => {
    if (!scanResult) return;
    if (!scanResult.acknowledged && !showAckWarning) {
      setShowAckWarning(true);
      return;
    }
    setShowAckWarning(false);
    try {
      await api.patch(`/admin/qr-scan/${scanResult.registrationId}/attend`);
      const isHackathon = scanResult.event_type_slug === 'hackathon';
      if (isHackathon) {
        try {
          const { data: assignment } = await api.post(`/admin/hackathon-checkin/${scanResult.registrationId}`, {});
          toast.success(`Checked in & assigned to Team ${assignment?.team?.team_number ?? '—'}`);
          setScanResult({
            ...scanResult,
            status: 'attended',
            checkedIn: true,
            team_number: assignment?.team?.team_number,
            team_domain: assignment?.team?.primary_domain,
            is_new_team: assignment?.isNewTeam,
          });
        } catch (err) {
          toast.error(err.response?.data?.message || 'Checked in, but team assignment failed');
          setScanResult({ ...scanResult, status: 'attended', checkedIn: true });
        }
      } else {
        toast.success('Marked as attended!');
        setScanResult({ ...scanResult, status: 'attended', checkedIn: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as attended');
    }
  };

  const statusBadge = status => {
    const map = {
      attended: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
      shortlisted: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
      pending: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
      rejected: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
    };
    return map[status] || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80';
  };

  return (
    <div>
      <div className="admin-page-head">
        <h1>QR code scanner</h1>
        <p>Scan participant QR codes or paste payload JSON to verify and mark attendance.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="ui-card p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">Camera</h2>
            <div id="qr-reader" ref={scannerRef} className="mb-4 mx-auto w-full max-w-xs overflow-hidden rounded-xl ring-1 ring-slate-200" />
            <div className="flex gap-3">
              {!scanning ? (
                <button type="button" className="ui-btn-primary" onClick={startScanner}>
                  Start scanner
                </button>
              ) : (
                <button type="button" className="ui-btn-danger" onClick={stopScanner}>
                  Stop scanner
                </button>
              )}
            </div>
          </div>

          <div className="ui-card p-6">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">Manual input</h2>
            <textarea
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="Paste QR code data (JSON)…"
              rows={3}
              className="ui-input min-h-24 resize-y"
            />
            <button
              type="button"
              onClick={handleManualScan}
              disabled={loading}
              className="ui-btn-primary mt-3 disabled:opacity-60"
            >
              {loading ? 'Looking up…' : 'Look up'}
            </button>
          </div>
        </div>

        <div>
          {loading && (
            <div className="flex justify-center py-16">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <span
                  className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
                  aria-hidden
                />
                Looking up registration…
              </div>
            </div>
          )}

          {scanResult && !loading && (
            <div className="ui-card p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">Participant</h2>
              <div className="divide-y divide-slate-100">
                {[
                  ['Name', scanResult.name],
                  ['Email', scanResult.email],
                  ['Phone', scanResult.phone],
                  ['CNIC', scanResult.cnic],
                  ['Event', scanResult.event ?? scanResult.workshop],
                  scanResult.event_type ? ['Event type', scanResult.event_type] : null,
                  ['Acknowledged', scanResult.acknowledged ? 'Yes' : 'No'],
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-4 py-3 text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="max-w-[60%] text-right font-medium text-slate-900">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadge(scanResult.status)}`}
                  >
                    {scanResult.status}
                  </span>
                </div>
              </div>

              {(scanResult.status === 'shortlisted' || scanResult.status === 'confirmed') && !showAckWarning && (
                <button type="button" onClick={handleMarkAttended} className="ui-btn-primary mt-6 w-full py-3">
                  {scanResult.event_type_slug === 'hackathon' ? 'Check in + assign team' : 'Mark as attended'}
                </button>
              )}

              {showAckWarning && (
                <div className="mt-6 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                  <div className="mb-2 flex items-center gap-2 text-amber-800">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <span className="font-bold">Not acknowledged</span>
                  </div>
                  <p className="mb-1 text-sm text-amber-900">
                    This person has <strong>not confirmed</strong> their attendance.
                  </p>
                  {checkinStats && checkinStats.unacknowledgedCheckedIn > 0 && (
                    <p className="mb-3 text-xs text-amber-700/80">
                      {checkinStats.unacknowledgedCheckedIn} unacknowledged {checkinStats.unacknowledgedCheckedIn === 1 ? 'person has' : 'people have'} already been checked in.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={handleMarkAttended} className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white">
                      Allow anyway
                    </button>
                    <button type="button" onClick={() => setShowAckWarning(false)} className="flex-1 rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {scanResult.status === 'attended' && (
                <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-4 text-center text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200/70">
                  {scanResult.team_number != null ? (
                    <>
                      Checked in &amp; assigned to <strong>Team #{scanResult.team_number}</strong>
                      {scanResult.is_new_team ? ' (new team)' : ''}
                      {scanResult.team_domain ? <> · Domain: <strong>{scanResult.team_domain}</strong></> : null}
                    </>
                  ) : (
                    'Already checked in'
                  )}
                </div>
              )}

              {scanResult.status === 'pending' && (
                <div className="mt-6 rounded-xl bg-amber-50 py-4 text-center text-sm font-semibold text-amber-900 ring-1 ring-amber-200/70">
                  Registration is still pending —  must be shortlisted first
                </div>
              )}

              {scanResult.status === 'rejected' && (
                <div className="mt-6 rounded-xl bg-rose-50 py-4 text-center text-sm font-semibold text-rose-900 ring-1 ring-rose-200/70">
                  Registration was rejected
                </div>
              )}
            </div>
          )}

          {!scanResult && !loading && (
            <div className="ui-card flex min-h-[14rem] items-center justify-center p-6 text-center text-sm font-medium text-slate-500 sm:min-h-[16rem] sm:p-8">
              Scan a QR code or paste data to view participant info
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
