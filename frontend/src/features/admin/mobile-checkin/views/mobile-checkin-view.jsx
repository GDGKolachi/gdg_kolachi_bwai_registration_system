import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../../../axios-instance';

const STATUS_COLORS = {
  attended: 'bg-emerald-500',
  shortlisted: 'bg-sky-500',
  confirmed: 'bg-blue-500',
  pending: 'bg-amber-500',
  rejected: 'bg-rose-500',
};

export default function MobileCheckinView() {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [checkinStats, setCheckinStats] = useState(null);
  const [showAckWarning, setShowAckWarning] = useState(false);
  const html5QrRef = useRef(null);

  const fetchStats = useCallback(async (eventId) => {
    try {
      const { data } = await api.get(`/admin/checkin-stats/${eventId}`);
      setCheckinStats(data);
    } catch {
      // ignore
    }
  }, []);

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (html5QrRef.current) {
        await html5QrRef.current.stop().catch(() => {});
      }
      const html5QrCode = new Html5Qrcode('mobile-qr-reader');
      html5QrRef.current = html5QrCode;
      setScanning(true);
      setScanResult(null);
      setShowAckWarning(false);
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScan(decodedText);
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrRef.current = null;
          }).catch(() => {});
          setScanning(false);
        },
        () => {},
      );
    } catch {
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
    };
  }, []);

  const handleScan = async (qrData) => {
    setLoading(true);
    setShowAckWarning(false);
    try {
      const res = await api.post('/admin/qr-scan', { qr_data: qrData });
      setScanResult(res.data);
      if (res.data.event_id) {
        fetchStats(res.data.event_id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid QR code');
      setScanResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
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
          const { data: assignment } = await api.post(
            `/admin/hackathon-checkin/${scanResult.registrationId}`,
            {},
          );
          toast.success(`Checked in → Team ${assignment?.team?.team_number ?? '—'}`);
          setScanResult({
            ...scanResult,
            status: 'attended',
            checkedIn: true,
            team_number: assignment?.team?.team_number,
            team_domain: assignment?.team?.primary_domain,
            is_new_team: assignment?.isNewTeam,
          });
        } catch (err) {
          toast.error(err.response?.data?.message || 'Checked in but team assignment failed');
          setScanResult({ ...scanResult, status: 'attended', checkedIn: true });
        }
      } else {
        toast.success('Checked in!');
        setScanResult({ ...scanResult, status: 'attended', checkedIn: true });
      }
      if (scanResult.event_id) fetchStats(scanResult.event_id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const scanNext = () => {
    setScanResult(null);
    setShowAckWarning(false);
    startScanner();
  };

  const canCheckin = scanResult && ['shortlisted', 'confirmed'].includes(scanResult.status);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Check-in</h1>
          {checkinStats && (
            <p className="text-xs text-slate-400">
              {checkinStats.checkedIn} checked in
              {checkinStats.unacknowledgedCheckedIn > 0 && (
                <span className="ml-1 text-amber-400">
                  · {checkinStats.unacknowledgedCheckedIn} unacknowledged
                </span>
              )}
            </p>
          )}
        </div>
        {scanning && (
          <button
            type="button"
            onClick={stopScanner}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold"
          >
            Stop
          </button>
        )}
      </div>

      {/* Scanner area */}
      {!scanResult && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div
            id="mobile-qr-reader"
            className="mb-6 w-full max-w-sm overflow-hidden rounded-2xl"
          />
          {!scanning && (
            <button
              type="button"
              onClick={startScanner}
              className="flex items-center gap-2 rounded-2xl bg-gdg-blue px-8 py-4 text-base font-bold shadow-lg shadow-blue-500/30"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V6a3 3 0 013-3h3M21 9V6a3 3 0 00-3-3h-3M3 15v3a3 3 0 003 3h3M21 15v3a3 3 0 01-3 3h-3" />
              </svg>
              Scan QR Code
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-3 border-slate-600 border-t-white" />
        </div>
      )}

      {/* Result card */}
      {scanResult && !loading && (
        <div className="flex flex-1 flex-col px-4 pb-4">
          <div className="flex-1 rounded-2xl bg-slate-900 p-5">
            {/* Name + status */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{scanResult.name}</h2>
                <p className="mt-0.5 text-sm text-slate-400">{scanResult.event}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold capitalize text-white ${STATUS_COLORS[scanResult.status] || 'bg-slate-600'}`}
              >
                {scanResult.status}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="text-right text-slate-300">{scanResult.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone</span>
                <span className="text-slate-300">{scanResult.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CNIC</span>
                <span className="text-slate-300">{scanResult.cnic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Acknowledged</span>
                <span className={scanResult.acknowledged ? 'font-semibold text-emerald-400' : 'font-semibold text-amber-400'}>
                  {scanResult.acknowledged ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Acknowledgement warning dialog */}
            {showAckWarning && (
              <div className="mt-4 rounded-xl bg-amber-950/60 p-4 ring-1 ring-amber-500/40">
                <div className="mb-2 flex items-center gap-2 text-amber-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span className="font-bold">Not acknowledged</span>
                </div>
                <p className="mb-1 text-sm text-amber-200/80">
                  This person has <strong>not confirmed</strong> their attendance.
                </p>
                {checkinStats && checkinStats.unacknowledgedCheckedIn > 0 && (
                  <p className="mb-3 text-xs text-amber-300/60">
                    {checkinStats.unacknowledgedCheckedIn} unacknowledged {checkinStats.unacknowledgedCheckedIn === 1 ? 'person has' : 'people have'} already been checked in for this event.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCheckin}
                    className="flex-1 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white"
                  >
                    Allow anyway
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAckWarning(false)}
                    className="flex-1 rounded-xl bg-slate-700 py-3 text-sm font-bold text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Attended result */}
            {scanResult.status === 'attended' && (
              <div className="mt-4 rounded-xl bg-emerald-900/50 p-4 text-center ring-1 ring-emerald-500/30">
                <span className="text-lg">✓</span>
                <p className="font-bold text-emerald-400">
                  {scanResult.team_number != null ? (
                    <>
                      Checked in → Team #{scanResult.team_number}
                      {scanResult.is_new_team ? ' (new)' : ''}
                    </>
                  ) : (
                    'Checked in'
                  )}
                </p>
                {scanResult.team_domain && (
                  <p className="text-xs text-emerald-300/60">{scanResult.team_domain}</p>
                )}
              </div>
            )}

            {/* Pending */}
            {scanResult.status === 'pending' && (
              <div className="mt-4 rounded-xl bg-amber-900/50 p-4 text-center ring-1 ring-amber-500/30">
                <p className="font-semibold text-amber-400">Still pending — not shortlisted yet</p>
              </div>
            )}

            {/* Rejected */}
            {scanResult.status === 'rejected' && (
              <div className="mt-4 rounded-xl bg-rose-900/50 p-4 text-center ring-1 ring-rose-500/30">
                <p className="font-semibold text-rose-400">Registration was rejected</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
            {canCheckin && !showAckWarning && (
              <button
                type="button"
                onClick={handleCheckin}
                className="flex-1 rounded-2xl bg-emerald-600 py-4 text-base font-bold shadow-lg shadow-emerald-500/20"
              >
                {scanResult.event_type_slug === 'hackathon' ? 'Check in + assign' : 'Check in'}
              </button>
            )}
            <button
              type="button"
              onClick={scanNext}
              className={`rounded-2xl bg-slate-700 py-4 text-base font-bold ${canCheckin && !showAckWarning ? 'px-6' : 'flex-1'}`}
            >
              Scan next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
