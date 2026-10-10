import { useEffect } from 'react';
import { useCreditsQr } from '../credits-repository';
import { copyText } from '../credits-service';

/** "Show credits QR": the attendee scans this with their phone and lands on the confirm page. */
export default function CreditsQrModal({ registrationId, name, onClose }) {
  const { data, isLoading, error } = useCreditsQr(registrationId);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-card max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-b-none rounded-t-2xl p-5 text-center shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Credits QR"
      >
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Credits QR{name ? `: ${name}` : ''}</h2>
        <p className="mt-1 text-sm text-slate-600">Ask the attendee to scan this with their phone</p>

        <div className="mt-4 flex min-h-64 items-center justify-center">
          {isLoading && (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-label="Loading" />
          )}
          {error && (
            <p className="text-sm font-medium text-gdg-red">
              {error.response?.data?.message || 'Could not create the QR code'}
            </p>
          )}
          {data && (
            <img src={data.qr_data_url} alt="Credits confirmation QR code" className="h-64 w-64 rounded-xl ring-1 ring-slate-200" />
          )}
        </div>

        {data && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-left">
            <span className="min-w-0 flex-1 break-all font-mono text-xs text-slate-700">{data.confirm_url}</span>
            <button
              type="button"
              className="ui-btn-secondary shrink-0 !px-3 !py-1.5 text-xs"
              onClick={() => copyText(data.confirm_url, 'Link')}
            >
              Copy
            </button>
          </div>
        )}

        <button type="button" className="ui-btn-primary mt-5 w-full" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
