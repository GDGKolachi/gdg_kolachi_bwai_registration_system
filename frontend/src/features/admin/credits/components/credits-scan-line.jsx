import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { creditsApi } from '../credits-api';
import { useSendCredits } from '../credits-repository';
import { scanStatusInfo, errorMessage } from '../credits-service';

const TONES = {
  light: {
    ok: 'text-emerald-800', warn: 'text-amber-800', bad: 'text-rose-700', muted: 'text-slate-400',
    btn: 'rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-gdg-blue hover:text-gdg-blue disabled:opacity-60',
  },
  dark: {
    ok: 'text-emerald-300', warn: 'text-amber-300', bad: 'text-rose-300', muted: 'text-slate-500',
    btn: 'rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600 disabled:opacity-60',
  },
};

/**
 * One line under a successful scan: what happened to the credits email, plus a
 * Retry / Send button where that makes sense. `status` comes from the
 * `credits.status` the attend and hackathon-checkin responses carry.
 */
export default function CreditsScanLine({ status, registrationId, variant = 'light', align = 'center' }) {
  const send = useSendCredits();
  const [override, setOverride] = useState(null);

  // While the email is still queued, poll so the line flips to sent / failed
  // once the background sender has dealt with it.
  const shownBefore = override?.status ?? status;
  const inFlight = shownBefore === 'pending' || shownBefore === 'sending';
  const live = useQuery({
    queryKey: ['credits', 'scan-line', registrationId],
    queryFn: () => creditsApi.getForRegistration(registrationId),
    enabled: !!registrationId && inFlight,
    refetchInterval: 2000,
    gcTime: 0,
  });
  const liveIsNewer = live.data && live.data.email_status !== 'none'
    && live.dataUpdatedAt > (override?.at ?? 0);
  const current = liveIsNewer ? live.data.email_status : (override?.status ?? status);
  if (!current) return null;

  const info = scanStatusInfo(current);
  const t = TONES[variant];

  const onSend = async () => {
    try {
      const view = await send.mutateAsync(registrationId);
      setOverride({ status: view.email_status, at: Date.now() });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the credits email'));
    }
  };

  return (
    <div className={`mt-3 flex flex-wrap items-center ${align === 'start' ? 'justify-start' : 'justify-center'} gap-x-3 gap-y-1.5 text-xs font-semibold`} data-testid="credits-line">
      <span className={t[info.tone]}>{info.label}</span>
      {info.action && (
        <button type="button" className={t.btn} onClick={onSend} disabled={send.isPending}>
          {send.isPending ? 'Sending…' : info.action}
        </button>
      )}
    </div>
  );
}
