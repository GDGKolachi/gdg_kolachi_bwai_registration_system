import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  STATUS_COLORS,
  STATUS_BUTTON_COLORS,
  STATUS_LABELS,
  VALID_TRANSITIONS,
} from '../../../../shared/constants/registration-status';
import { formatDateTime } from '../../../../shared/utils/formatDate';
import { linkedinUrl, githubUrl, externalUrl, profileHandle } from '../../../../shared/utils/profileUrl';

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  close: 'M6 18L18 6M6 6l12 12',
  prev: 'M15 19l-7-7 7-7',
  next: 'M9 5l7 7-7 7',
  copy: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3',
  external: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
};

const hasValue = (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);

async function copyToClipboard(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Could not copy to clipboard');
  }
}

function SectionShell({ title, children }) {
  return (
    <section className="border-t border-slate-100 px-5 py-4 first:border-t-0 sm:px-6">
      <h3 className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

/**
 * `fields` is a list of descriptors rather than JSX so empty ones can be
 * dropped before deciding whether the whole section is worth rendering.
 */
function Section({ title, fields }) {
  const visible = fields.filter(f => f && hasValue(f.value));
  if (visible.length === 0) return null;
  return (
    <SectionShell title={title}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {visible.map(f => <Field key={f.label} {...f} />)}
      </dl>
    </SectionShell>
  );
}

function Field({ label, value, wide = false, copy = null, href = null, mono = false }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className={`mt-0.5 flex items-start gap-1.5 text-sm text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>
        {href ? (
          <a
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="break-all font-medium text-gdg-blue hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="break-words whitespace-pre-wrap">{value}</span>
        )}
        {copy && (
          <button
            type="button"
            onClick={() => copyToClipboard(copy, label)}
            className="mt-0.5 shrink-0 text-slate-300 transition-colors hover:text-gdg-blue"
            title={`Copy ${label.toLowerCase()}`}
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            <Icon path={ICONS.copy} className="h-3.5 w-3.5" />
          </button>
        )}
      </dd>
    </div>
  );
}

function LinkChip({ label, url, raw }) {
  if (!url) {
    // Keep the unusable value visible — admins still need to see what was typed.
    return hasValue(raw) ? (
      <span
        className="inline-flex max-w-full items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500"
        title={`${label}: not a valid link`}
      >
        <span className="truncate">{label}: {raw}</span>
      </span>
    ) : null;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 rounded-lg bg-gdg-blue/8 px-2 py-1 text-xs font-semibold text-gdg-blue ring-1 ring-gdg-blue/15 transition-colors hover:bg-gdg-blue/15"
      title={url}
    >
      <span className="truncate">{label} · {profileHandle(url)}</span>
      <Icon path={ICONS.external} className="h-3 w-3 shrink-0" />
    </a>
  );
}

/**
 * Record-detail drawer for one registration. Sits beside the grid rather than
 * over it so the list stays in view, and steps through the loaded page with
 * Prev/Next (or the arrow keys) without going back to the table.
 */
export default function RegistrationDetailDrawer({
  registration,
  index,
  total,
  positionLabel,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onStatusChange,
  statusPending = false,
  isSelected = false,
  onToggleSelect,
}) {
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    panelRef.current?.focus();
    return () => {
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      // Don't hijack the arrows while someone is typing in the drawer.
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        if (e.key !== 'Escape') return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k') {
        if (hasPrev) { e.preventDefault(); onPrev(); }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j') {
        if (hasNext) { e.preventDefault(); onNext(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  // Shown while a page-crossing Prev/Next is fetching the neighbouring page.
  if (!registration) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} role="presentation">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Loading registration details"
          onClick={(e) => e.stopPropagation()}
          className="flex h-full w-full max-w-xl items-center justify-center bg-white shadow-2xl outline-none sm:border-l sm:border-slate-200"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-hidden />
            Loading…
          </span>
        </div>
      </div>
    );
  }

  const r = registration;
  const a = r.attendee || {};
  const t = r.team || r.team_member?.team || null;
  const teamNumber = t?.team_number ?? r.team_number ?? null;
  const teamName = t?.name ?? r.team_name ?? null;
  const teamLabel = [teamNumber != null ? `#${teamNumber}` : null, teamName].filter(Boolean).join(' · ');

  const linkedin = linkedinUrl(a.linkedin);
  const github = githubUrl(a.github);
  const portfolio = externalUrl(r.portfolio_url);
  const hasLinks = hasValue(a.github) || hasValue(a.linkedin) || hasValue(r.portfolio_url);

  const nextStatuses = VALID_TRANSITIONS[r.status] ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl outline-none sm:border-l sm:border-slate-200"
      >
        {/* Header */}
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="reg-detail-title" className="truncate text-lg font-bold text-slate-900">
                  {a.name || 'Unnamed registrant'}
                </h2>
                <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'}`}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
                {r.is_captain && (
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[0.65rem] font-semibold text-indigo-900 ring-1 ring-indigo-200/70">
                    Captain
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                {teamLabel ? `${teamLabel} · ` : ''}
                {a.university_org || 'No organization'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close details"
            >
              <Icon path={ICONS.close} className="h-5 w-5" />
            </button>
          </div>

          {/* Record stepper */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500">
              {positionLabel ?? `${index + 1} of ${total}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gdg-blue hover:text-gdg-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                title="Previous registration (← or K)"
              >
                <Icon path={ICONS.prev} className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-gdg-blue hover:text-gdg-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                title="Next registration (→ or J)"
              >
                Next
                <Icon path={ICONS.next} className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section
            title="Contact"
            fields={[
              { label: 'Email', value: a.email, href: a.email ? `mailto:${a.email}` : null, copy: a.email, wide: true },
              { label: 'Phone', value: a.phone, href: a.phone ? `tel:${a.phone}` : null, copy: a.phone },
              { label: 'CNIC', value: a.cnic, copy: a.cnic },
              { label: 'Gender', value: a.gender },
              { label: 'University / Organization', value: a.university_org },
              { label: 'Profile / primary skill', value: a.best_describes_you },
            ]}
          />

          {hasLinks && (
            <SectionShell title="Links">
              <div className="flex flex-wrap gap-2">
                <LinkChip label="GitHub" url={github} raw={a.github} />
                <LinkChip label="LinkedIn" url={linkedin} raw={a.linkedin} />
                <LinkChip label="Portfolio" url={portfolio} raw={r.portfolio_url} />
              </div>
            </SectionShell>
          )}

          <Section
            title="Team &amp; role"
            fields={[
              { label: 'Team', value: teamLabel },
              { label: 'Role', value: r.is_captain ? 'Captain' : (teamLabel ? 'Member' : null) },
              { label: 'Team origin', value: t?.origin },
            ]}
          />

          <Section
            title="Hackathon answers"
            fields={[
              { label: 'Domain', value: r.domain, wide: true },
              { label: 'Track', value: r.track },
              { label: 'Slot', value: r.slot },
              { label: 'Role bucket', value: r.role_bucket },
              { label: 'Years of experience', value: r.years_experience },
              { label: 'Prior hackathons', value: r.prior_hackathons },
              { label: 'AI experience', value: r.ai_experience },
            ]}
          />

          {Array.isArray(r.skills) && r.skills.length > 0 && (
            <SectionShell title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {r.skills.map((s) => (
                  <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {s}
                  </span>
                ))}
              </div>
            </SectionShell>
          )}

          {(hasValue(r.best_project) || hasValue(r.motivation)) && (
            <SectionShell title="Long-form answers">
              <div className="space-y-3">
                {hasValue(r.best_project) && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Best project</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.best_project}</p>
                  </div>
                )}
                {hasValue(r.motivation) && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Motivation</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.motivation}</p>
                  </div>
                )}
              </div>
            </SectionShell>
          )}

          <Section
            title="Registration"
            fields={[
              { label: 'Registered at', value: formatDateTime(r.registered_at) },
              { label: 'Registration mode', value: r.registration_mode },
              { label: 'Ambassador', value: r.ambassador },
              { label: 'Spot acknowledged', value: r.acknowledged ? 'Yes' : 'No' },
              { label: 'Checked in', value: r.checked_in ? 'Yes' : 'No' },
              { label: 'Checked in at', value: r.checked_in_at ? formatDateTime(r.checked_in_at) : null },
              { label: 'Acknowledgement', value: r.acknowledgement_expired ? 'Expired' : null },
              { label: 'Registration ID', value: r.id, copy: r.id, mono: true, wide: true },
            ]}
          />
        </div>

        {/* Footer actions */}
        <footer className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Set status:</span>
            {nextStatuses.length === 0 ? (
              <span className="text-xs italic text-slate-400">No further transitions from “{STATUS_LABELS[r.status] ?? r.status}”</span>
            ) : (
              nextStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStatusChange(r.id, s)}
                  disabled={statusPending}
                  className={`rounded-lg px-2.5 py-1.5 text-[0.7rem] font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs ${STATUS_BUTTON_COLORS[s]}`}
                >
                  {STATUS_LABELS[s] ?? s}
                </button>
              ))
            )}
            {onToggleSelect && (
              <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(r.id)}
                  className="h-4 w-4 cursor-pointer rounded accent-gdg-blue"
                />
                Selected for bulk actions
              </label>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
