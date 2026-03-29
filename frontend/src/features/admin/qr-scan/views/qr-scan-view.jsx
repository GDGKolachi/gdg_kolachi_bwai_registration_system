import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../../../axios-instance';

export default function QrScanView() {
  const [scanResult, setScanResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

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
        (decodedText) => {
          handleScan(decodedText);
          html5QrCode.stop().catch(() => {});
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
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleScan = async (qrData) => {
    setLoading(true);
    try {
      const res = await api.post('/admin/qr-scan', { qr_data: qrData });
      setScanResult(res.data);
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
    try {
      await api.patch(`/admin/qr-scan/${scanResult.registrationId}/attend`);
      toast.success('Marked as attended!');
      setScanResult({ ...scanResult, status: 'attended', checkedIn: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as attended');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gdg-dark">QR Code Scanner</h1>
        <p className="text-gdg-gray mt-2">Scan participant QR codes to view info and mark attendance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="bg-white rounded-xl p-6 border border-gdg-border mb-4">
            <h2 className="text-lg font-semibold mb-4">Camera Scanner</h2>
            <div id="qr-reader" ref={scannerRef} className="w-full mb-4 rounded-lg overflow-hidden" />
            <div className="flex gap-3">
              {!scanning ? (
                <button onClick={startScanner} className="py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600">
                  Start Scanner
                </button>
              ) : (
                <button onClick={stopScanner} className="py-2.5 px-6 bg-gdg-red text-white rounded-lg font-semibold text-sm hover:bg-red-600">
                  Stop Scanner
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gdg-border">
            <h2 className="text-lg font-semibold mb-4">Manual QR Data Input</h2>
            <div className="flex gap-3">
              <textarea
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder='Paste QR code data here (JSON format)...'
                rows={3}
                className="flex-1 px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15 resize-y"
              />
            </div>
            <button onClick={handleManualScan} disabled={loading} className="mt-3 py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-60">
              {loading ? 'Scanning...' : 'Look Up'}
            </button>
          </div>
        </div>

        <div>
          {loading && (
            <div className="flex justify-center items-center py-16 text-gdg-gray">Looking up registration...</div>
          )}

          {scanResult && !loading && (
            <div className="bg-white rounded-xl p-6 border border-gdg-border">
              <h2 className="text-lg font-semibold mb-4">Participant Info</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gdg-border">
                  <span className="text-sm text-gdg-gray">Name</span>
                  <span className="font-medium">{scanResult.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gdg-border">
                  <span className="text-sm text-gdg-gray">Email</span>
                  <span className="font-medium">{scanResult.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gdg-border">
                  <span className="text-sm text-gdg-gray">Phone</span>
                  <span className="font-medium">{scanResult.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gdg-border">
                  <span className="text-sm text-gdg-gray">CNIC</span>
                  <span className="font-medium">{scanResult.cnic}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gdg-border">
                  <span className="text-sm text-gdg-gray">Workshop</span>
                  <span className="font-medium">{scanResult.workshop}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gdg-border">
                  <span className="text-sm text-gdg-gray">Status</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    scanResult.status === 'attended' ? 'bg-green-100 text-gdg-green' :
                    scanResult.status === 'shortlisted' ? 'bg-blue-100 text-gdg-blue' :
                    scanResult.status === 'pending' ? 'bg-yellow-100 text-amber-600' :
                    'bg-red-100 text-gdg-red'
                  }`}>{scanResult.status}</span>
                </div>
              </div>

              {scanResult.status === 'shortlisted' && (
                <button onClick={handleMarkAttended} className="mt-6 w-full py-3 px-6 bg-gdg-green text-white rounded-lg font-semibold text-sm hover:bg-green-600">
                  Mark as Attended
                </button>
              )}

              {scanResult.status === 'attended' && (
                <div className="mt-6 text-center p-4 bg-green-100 rounded-lg text-gdg-green font-semibold">
                  Already checked in
                </div>
              )}

              {scanResult.status === 'pending' && (
                <div className="mt-6 text-center p-4 bg-yellow-100 rounded-lg text-amber-600 font-semibold">
                  Registration is still pending - must be shortlisted first
                </div>
              )}

              {scanResult.status === 'rejected' && (
                <div className="mt-6 text-center p-4 bg-red-100 rounded-lg text-gdg-red font-semibold">
                  Registration was rejected
                </div>
              )}
            </div>
          )}

          {!scanResult && !loading && (
            <div className="bg-white rounded-xl p-6 border border-gdg-border text-center py-16 text-gdg-gray">
              Scan a QR code or paste QR data to view participant info
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
