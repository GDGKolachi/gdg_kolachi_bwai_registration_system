import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  STATUS_COLORS,
  STATUS_BUTTON_COLORS,
  STATUS_LABELS,
  VALID_TRANSITIONS,
} from '../../../../shared/constants/registration-status';
import { formatDateTime } from '../../../../shared/utils/formatDate';
import { linkedinUrl, githubUrl, externalUrl, profileHandle } from '../../../../shared/utils/profileUrl';
import { useTeam, useRequestTeamPayment, useConfirmTeamPayment, useRejectTeamPayment } from '../../teams/teams-repository';
import { PAYMENT_LABELS, PAYMENT_COLORS, paymentCountdown } from '../../teams/payment-state';

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
  chevronDown: 'M19 9l-7 7-7-7',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
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

function StatusPill({ status, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
      } ${className}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function CaptainBadge() {
  return (
    <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[0.65rem] font-semibold text-indigo-900 ring-1 ring-indigo-200/70">
      Captain
    </span>
  );
}

/**
 * Sections render at drawer width by default, and tightened when nested inside
 * a roster member card — set once by the card rather than threaded through
 * every section descriptor.
 */
const CompactSections = createContext(false);

function SectionShell({ title, children, action = null }) {
  const compact = useContext(CompactSections);
  return (
    <section className={`border-t border-slate-100 first:border-t-0 ${compact ? 'px-3 py-3' : 'px-5 py-4 sm:px-6'}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-400">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * `fields` is a list of descriptors rather than JSX so empty ones can be
 * dropped before deciding whether the whole section is worth rendering.
 */
function Section({ title, fields, action = null }) {
  const visible = fields.filter(f => f && hasValue(f.value));
  if (visible.length === 0) return null;
  return (
    <SectionShell title={title} action={action}>
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

function SkillChips({ skills }) {
  if (!Array.isArray(skills) || skills.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {s}
        </span>
      ))}
    </div>
  );
}

function LongFormAnswer({ label, value }) {
  if (!hasValue(value)) return null;
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{value}</p>
    </div>
  );
}

/**
 * Every stored field for one registration. Shared by the person view and by an
 * expanded roster member, so a teammate is never shown less than the person you
 * happened to open the drawer from.
 *
 * `teamSection` is slotted in after the links rather than rendered here, because
 * it is the only part that differs between the two callers.
 */
function RegistrationSections({ r, teamSection = null, showRegistrationMeta = true }) {
  const a = r.attendee || {};
  const github = githubUrl(a.github);
  const linkedin = linkedinUrl(a.linkedin);
  const portfolio = externalUrl(r.portfolio_url);
  const hasLinks = hasValue(a.github) || hasValue(a.linkedin) || hasValue(r.portfolio_url);

  return (
    <>
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

      {teamSection}

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
          <SkillChips skills={r.skills} />
        </SectionShell>
      )}

      {(hasValue(r.best_project) || hasValue(r.motivation)) && (
        <SectionShell title="Long-form answers">
          <div className="space-y-3">
            <LongFormAnswer label="Best project" value={r.best_project} />
            <LongFormAnswer label="Motivation" value={r.motivation} />
          </div>
        </SectionShell>
      )}

      {showRegistrationMeta && (
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
      )}
    </>
  );
}

/**
 * One member of the roster. Collapsed it is a scannable summary line; expanded
 * it shows the same detail as the drawer's own person view, using data that
 * already arrived with the team, so opening a teammate costs no extra request.
 */
function RosterMember({ member, isCurrent }) {
  // Open state is derived, not synced: null means "follow whoever is current",
  // so stepping to another member of the same team expands them even though
  // these cards stay mounted. Once toggled by hand the choice sticks, which is
  // what makes comparing two members side by side possible.
  const [manualOpen, setManualOpen] = useState(null);
  const open = manualOpen ?? isCurrent;
  const a = member.attendee || {};
  const isDeleted = !!member.deleted_at;

  const summary = [a.best_describes_you, member.role_bucket, member.years_experience]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors ${
        isCurrent ? 'border-gdg-blue/40 bg-gdg-blue/[0.04]' : 'border-slate-200 bg-white'
      } ${isDeleted ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            member.is_captain ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-600'
          }`}
          aria-hidden
        >
          {(a.name || '?').trim().charAt(0).toUpperCase()}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={`truncate text-sm font-semibold text-slate-900 ${isDeleted ? 'line-through' : ''}`}>
              {a.name || 'Unnamed registrant'}
            </span>
            {member.is_captain && <CaptainBadge />}
            {isCurrent && (
              <span className="shrink-0 rounded-full bg-gdg-blue/10 px-2 py-0.5 text-[0.65rem] font-semibold text-gdg-blue ring-1 ring-gdg-blue/20">
                Viewing
              </span>
            )}
            {isDeleted && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600 ring-1 ring-slate-200/80">
                Deleted
              </span>
            )}
            <StatusPill status={member.status} />
          </span>
          {summary && <span className="mt-0.5 block truncate text-xs text-slate-500">{summary}</span>}
          {a.email && <span className="mt-0.5 block truncate text-xs text-slate-400">{a.email}</span>}
        </span>

        <span
          className={`mt-1 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <Icon path={ICONS.chevronDown} className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <CompactSections.Provider value={true}>
          <div className="border-t border-slate-100 bg-slate-50/40">
            <RegistrationSections r={member} showRegistrationMeta={false} />
            <Section
              title="Registration"
              fields={[
                { label: 'Registered at', value: formatDateTime(member.registered_at) },
                { label: 'Spot acknowledged', value: member.acknowledged ? 'Yes' : 'No' },
                { label: 'Checked in', value: member.checked_in ? 'Yes' : 'No' },
                { label: 'Registration ID', value: member.id, copy: member.id, mono: true, wide: true },
              ]}
            />
          </div>
        </CompactSections.Provider>
      )}
    </div>
  );
}


/**
 * The team's deposit: where it stands, what the captain says they sent, and the
 * actions that move it forward. Rejecting keeps the team able to resubmit — a
 * mistyped transaction ID should not cost them their place.
 */
function DepositSection({ team }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const request = useRequestTeamPayment();
  const confirm = useConfirmTeamPayment();
  const reject = useRejectTeamPayment();
  const busy = request.isPending || confirm.isPending || reject.isPending;

  const state = team.payment_state || 'not_requested';
  const deposit = team.deposit;
  const countdown = paymentCountdown(state, team.payment_hours_remaining);

  const run = async (fn, okMessage) => {
    try {
      await fn();
      toast.success(okMessage);
      setRejecting(false);
      setReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <SectionShell title="Deposit">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_COLORS[state] || PAYMENT_COLORS.not_requested}`}>
          {PAYMENT_LABELS[state] || state}
        </span>
        {countdown && <span className="text-xs text-slate-500">{countdown}</span>}
        {deposit && (
          <span className="text-xs text-slate-500">
            {deposit.display} · {deposit.payeeName} ({deposit.payeeService}) · one payment per team
          </span>
        )}
      </div>

      {state === 'expired' && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900 ring-1 ring-rose-200/70">
          The {deposit?.windowHours ?? 24}-hour window closed with nothing submitted. Nobody has been
          rejected — decide whether to re-request (which restarts the clock) or drop the team.
        </p>
      )}

      {state === 'rejected' && team.payment_rejection_reason && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900 ring-1 ring-rose-200/70">
          Rejected: {team.payment_rejection_reason} — the team can still submit again.
        </p>
      )}

      {(team.payment_reference || team.payment_sender_name) && (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Transaction ID" value={team.payment_reference} copy={team.payment_reference} mono />
          <Field label="Sent by" value={team.payment_sender_name} />
          {team.payment_note && <Field label="Note from team" value={team.payment_note} wide />}
          {team.payment_submitted_at && (
            <Field label="Submitted at" value={formatDateTime(team.payment_submitted_at)} />
          )}
          {team.payment_confirmed_at && (
            <Field label="Confirmed at" value={formatDateTime(team.payment_confirmed_at)} />
          )}
        </dl>
      )}

      {rejecting ? (
        <div className="mt-4 space-y-2">
          <label htmlFor="reject-reason" className="block text-xs font-semibold text-slate-600">
            Why is this being sent back? The team sees this.
          </label>
          <textarea
            id="reject-reason"
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. No transaction with this ID was received."
            className="ui-input w-full !text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => reject.mutateAsync({ teamId: team.id, reason }), 'Deposit sent back')}
              className="ui-btn-danger !px-3 !py-1.5 text-xs disabled:opacity-50"
            >
              Confirm rejection
            </button>
            <button type="button" onClick={() => setRejecting(false)} className="ui-btn-secondary !px-3 !py-1.5 text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {state === 'submitted' && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => confirm.mutateAsync(team.id), 'Deposit confirmed')}
                className="rounded-lg bg-gdg-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Confirm payment
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejecting(true)}
                className="ui-btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {state !== 'paid' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(
                () => request.mutateAsync([team.id]),
                state === 'not_requested' ? 'Deposit requested' : 'Request re-sent — clock restarted',
              )}
              className="ui-btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-50"
            >
              {state === 'not_requested' ? 'Request deposit' : 'Re-send request'}
            </button>
          )}
        </div>
      )}
    </SectionShell>
  );
}

/** The whole team: summary, team-level answers, then every member. */
function TeamPanel({ team, isLoading, isError, currentRegistrationId, teamLabelFallback }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm font-medium text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-hidden />
        Loading team…
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="px-6 py-16 text-center text-sm text-slate-500">
        <p className="font-medium text-slate-600">Could not load this team</p>
        <p className="mt-1 text-xs">
          {teamLabelFallback ? `Team ${teamLabelFallback} is attached to this registration, but its roster could not be fetched.` : 'The roster could not be fetched.'}
        </p>
      </div>
    );
  }

  const members = team.members || [];
  const sizeLabel = team.min_team_size && team.max_team_size
    ? `${team.member_count} of ${team.min_team_size}–${team.max_team_size} members`
    : `${team.member_count} member${team.member_count === 1 ? '' : 's'}`;
  const statusCounts = Object.entries(team.status_counts || {});

  return (
    <>
      <SectionShell title="Team">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-slate-900">
            {team.team_number != null ? `#${team.team_number}` : 'Team'}
            {team.name ? ` · ${team.name}` : ''}
          </span>
          {team.locked_at && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-800 ring-1 ring-emerald-200/70">
              Locked
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <Icon path={ICONS.users} className="h-3.5 w-3.5" />
            {sizeLabel}
          </span>
          {team.origin && (
            <span>{team.origin === 'self_registered' ? 'Self-registered team' : 'Auto-formed at check-in'}</span>
          )}
          {team.primary_domain && <span className="truncate">{team.primary_domain}</span>}
        </div>

        {statusCounts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {statusCounts.map(([status, count]) => (
              <span
                key={status}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
                }`}
              >
                {count} {STATUS_LABELS[status] ?? status}
              </span>
            ))}
          </div>
        )}

        {team.below_minimum && (
          <p className="mt-3 inline-flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200/70">
            <Icon path={ICONS.warning} className="mt-px h-3.5 w-3.5 shrink-0" />
            Below the minimum team size — this team needs more members before it can be locked.
          </p>
        )}
      </SectionShell>

      <DepositSection team={team} />

      <Section
        title="Team answers"
        fields={[
          { label: 'Has an idea', value: team.has_idea ? 'Yes' : null },
          { label: 'Worked together before', value: team.worked_together_before },
          { label: 'Idea', value: team.idea_description, wide: true },
        ]}
      />

      <SectionShell title={`Members (${members.length})`}>
        <p className="-mt-1 mb-3 text-xs text-slate-500">
          Tap a member to expand their full registration. The person you opened is highlighted.
        </p>
        <div className="space-y-2">
          {members.map((m) => (
            <RosterMember key={m.id} member={m} isCurrent={m.id === currentRegistrationId} />
          ))}
          {members.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              This team has no members yet.
            </p>
          )}
        </div>
      </SectionShell>
    </>
  );
}

/**
 * Record-detail drawer for one registration. Sits beside the grid rather than
 * over it so the list stays in view, and steps through the loaded page with
 * Prev/Next (or the arrow keys) without going back to the table.
 *
 * When the registration belongs to a team, a second tab shows the whole roster
 * — every teammate's full registration — so a captain (or any member) can be
 * judged in the context of the team rather than alone.
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
  initialTab = 'person',
  statusScopeNote = null,
}) {
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const [tab, setTab] = useState(initialTab);

  const r = registration;
  const a = r?.attendee || {};
  const t = r?.team || r?.team_member?.team || null;
  const teamId = t?.id ?? null;
  const teamNumber = t?.team_number ?? r?.team_number ?? null;
  const teamName = t?.name ?? r?.team_name ?? null;
  const teamLabel = useMemo(
    () => [teamNumber != null ? `#${teamNumber}` : null, teamName].filter(Boolean).join(' · '),
    [teamNumber, teamName],
  );

  const { data: team, isLoading: teamLoading, isError: teamError } = useTeam(teamId);

  // Derived rather than reset, so stepping to a registrant with no team falls
  // back to the person view without leaving a stale roster on screen.
  const activeTab = teamId ? tab : 'person';

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

  const nextStatuses = VALID_TRANSITIONS[r.status] ?? [];
  const memberCount = team?.member_count ?? null;

  const teamSection = (
    <Section
      title="Team &amp; role"
      action={teamId ? (
        <button
          type="button"
          onClick={() => setTab('team')}
          className="text-[0.7rem] font-semibold text-gdg-blue transition-colors hover:underline"
        >
          View full team →
        </button>
      ) : null}
      fields={[
        { label: 'Team', value: teamLabel },
        { label: 'Role', value: r.is_captain ? 'Captain' : (teamLabel ? 'Member' : null) },
        { label: 'Team origin', value: t?.origin },
      ]}
    />
  );

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
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="reg-detail-title" className="truncate text-lg font-bold text-slate-900">
                  {a.name || 'Unnamed registrant'}
                </h2>
                <StatusPill status={r.status} />
                {r.is_captain && <CaptainBadge />}
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

          {/* Person / team tabs — only meaningful when there is a team */}
          {teamId && (
            <div className="-mb-px mt-3 flex gap-1" role="tablist" aria-label="Detail view">
              {[
                { key: 'person', label: 'This registrant' },
                { key: 'team', label: memberCount != null ? `Team (${memberCount})` : 'Team' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => setTab(key)}
                  className={`rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                    activeTab === key
                      ? 'border-gdg-blue text-gdg-blue'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === 'team' && teamId ? (
            <TeamPanel
              team={team}
              isLoading={teamLoading}
              isError={teamError}
              currentRegistrationId={r.id}
              teamLabelFallback={teamLabel}
            />
          ) : (
            <RegistrationSections r={r} teamSection={teamSection} />
          )}
        </div>

        {/* Footer actions */}
        <footer className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Set status{statusScopeNote ? ` · ${statusScopeNote}` : ''}:
            </span>
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
