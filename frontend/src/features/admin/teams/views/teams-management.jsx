import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useTeams,
  useTeamFormationConfig,
  useUpdateTeamFormationConfig,
  useLockTeams,
  useUnlockTeam,
  useMoveMember,
  useSwapMembers,
  useUpdateTeamStatus,
} from '../teams-repository';
import {
  RegistrationStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../../../shared/constants/registration-status';

const BUCKET_COLORS = {
  developer: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  designer: 'bg-violet-50 text-violet-900 ring-1 ring-violet-200/70',
  product_designer: 'bg-fuchsia-50 text-fuchsia-900 ring-1 ring-fuchsia-200/70',
  qa: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
  sales: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  marketing: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  freelancer: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
  student: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
  other: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
};

const ORIGIN_BADGES = {
  self_registered: { label: 'Self-registered', className: 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/70' },
  auto: { label: 'Auto-formed', className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80' },
};

const teamLabelOf = (team) => `#${team.team_number}${team.name ? ` · ${team.name}` : ''}`;

export default function TeamsManagement() {
  const { eventId } = useParams();
  const { data: teams = [], isLoading } = useTeams(eventId);
  const { data: config } = useTeamFormationConfig(eventId);
  const updateConfig = useUpdateTeamFormationConfig(eventId);
  const lock = useLockTeams(eventId);
  const unlock = useUnlockTeam(eventId);
  const moveMember = useMoveMember(eventId);
  const swapMembers = useSwapMembers(eventId);
  const updateTeamStatus = useUpdateTeamStatus(eventId);

  const [configOpen, setConfigOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [moveTargetTeam, setMoveTargetTeam] = useState({});
  const [swapPartner, setSwapPartner] = useState({});
  const [expandedIdea, setExpandedIdea] = useState({});
  const [statusFailures, setStatusFailures] = useState({});
  const [busyTeamId, setBusyTeamId] = useState(null);

  const openConfig = () => {
    setDraft({ ...(config || {}) });
    setConfigOpen(true);
  };

  const saveConfig = async () => {
    try {
      await updateConfig.mutateAsync(draft);
      toast.success('Config updated');
      setConfigOpen(false);
    } catch {
      toast.error('Failed to update config');
    }
  };

  const handleLock = async () => {
    if (!confirm('Lock all teams? No further auto-placement or swaps will be allowed.')) return;
    try {
      await lock.mutateAsync();
      toast.success('Teams locked');
    } catch {
      toast.error('Lock failed');
    }
  };

  const togglePublish = async () => {
    const next = !config?.teams_published;
    try {
      await updateConfig.mutateAsync({ teams_published: next });
      toast.success(next ? 'Teams published to attendees' : 'Teams hidden from attendees');
    } catch {
      toast.error('Failed to update visibility');
    }
  };

  const handleMove = async (registrationId) => {
    const targetTeamId = moveTargetTeam[registrationId];
    if (!targetTeamId) return;
    try {
      await moveMember.mutateAsync({ teamId: targetTeamId, registrationId });
      toast.success('Member moved');
      setMoveTargetTeam((s) => ({ ...s, [registrationId]: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Move failed');
    }
  };

  const handleSwap = async (registrationId) => {
    const partnerRegistrationId = swapPartner[registrationId];
    if (!partnerRegistrationId) return;
    try {
      await swapMembers.mutateAsync({
        registrationIdA: registrationId,
        registrationIdB: partnerRegistrationId,
      });
      toast.success('Members swapped');
      setSwapPartner((s) => ({ ...s, [registrationId]: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Swap failed');
    }
  };

  const handleTeamStatus = async (team, status) => {
    const memberCount = team.member_count ?? (team.members || []).length;
    const verb = status === RegistrationStatus.SHORTLISTED ? 'Shortlist' : 'Reject';
    if (!confirm(`${verb} team ${teamLabelOf(team)} — all ${memberCount} member(s)?`)) return;
    setBusyTeamId(team.id);
    try {
      const result = await updateTeamStatus.mutateAsync({ teamId: team.id, status });
      const failed = result?.failed || [];
      const succeeded = result?.succeeded ?? 0;
      const noun = (STATUS_LABELS[status] || status).toLowerCase();
      setStatusFailures((s) => ({ ...s, [team.id]: failed }));
      if (failed.length === 0) {
        toast.success(`${succeeded} ${noun}`);
      } else {
        toast(`${succeeded} ${noun}, ${failed.length} failed`, { icon: '⚠️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `${verb} team failed`);
    } finally {
      setBusyTeamId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="admin-page-head mb-0">
          <h1>Teams</h1>
          <p>
            Hackathon team composition for this event.{' '}
            <Link to={`/admin/hackathon-checkin/${eventId}`} className="font-semibold text-gdg-blue hover:underline">Check in attendees →</Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={config?.teams_published ? 'ui-btn-secondary' : 'ui-btn-primary'}
            onClick={togglePublish}
            disabled={updateConfig.isPending}
          >
            {config?.teams_published ? 'Hide from My Team page' : 'Publish to My Team page'}
          </button>
          <button type="button" className="ui-btn-secondary" onClick={openConfig}>Edit formation rules</button>
          <button type="button" className="ui-btn-danger" onClick={handleLock} disabled={lock.isPending}>Lock teams</button>
        </div>
      </div>

      <div className={`mb-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${config?.teams_published ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/80'}`}>
        <span className={`inline-block h-2 w-2 rounded-full ${config?.teams_published ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden />
        {config?.teams_published
          ? 'Teams are visible on the public “My Team” lookup page.'
          : 'Teams are hidden — attendees cannot see their assignments on the public “My Team” page yet.'}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-hidden />
        </div>
      ) : teams.length === 0 ? (
        <div className="ui-card-quiet py-16 text-center text-sm font-medium text-slate-500">
          No teams formed yet. Teams form automatically as attendees check in to this hackathon.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const origin = ORIGIN_BADGES[team.origin] || ORIGIN_BADGES.auto;
            const selfRegistered = team.origin === 'self_registered';
            const statusCounts = Object.entries(team.status_counts || {}).filter(([, count]) => count > 0);
            const idea = team.idea_description || '';
            const ideaOpen = !!expandedIdea[team.id];
            const failures = statusFailures[team.id] || [];
            const memberNameOf = (registrationId) =>
              (team.members || []).find((m) => m.registration_id === registrationId)?.registration?.attendee?.name;
            const teamBusy = busyTeamId === team.id && updateTeamStatus.isPending;

            return (
              <div key={team.id} className="ui-card p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team</div>
                    <div className="text-2xl font-bold text-slate-900">#{team.team_number}{team.name ? ` · ${team.name}` : ''}</div>
                    {team.primary_domain && (
                      <div className="mt-1 text-xs text-slate-600">Domain: <strong>{team.primary_domain}</strong></div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${team.status === 'locked' ? 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70' : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70'}`}>
                      {team.status}
                    </span>
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${origin.className}`}>
                      {origin.label}
                    </span>
                  </div>
                </div>

                {team.below_minimum && (
                  <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/70">
                    Below minimum team size
                  </div>
                )}

                {statusCounts.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {statusCounts.map(([status, count]) => (
                      <span key={status} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80'}`}>
                        {STATUS_LABELS[status] ?? status} · {count}
                      </span>
                    ))}
                  </div>
                )}

                {selfRegistered && (
                  <div className="mb-3 space-y-1.5 rounded-lg bg-slate-50/70 px-3 py-2.5 ring-1 ring-slate-200/60">
                    <div className="text-xs text-slate-600">
                      Worked together before: <strong className="font-semibold text-slate-800">{team.worked_together_before || 'Not answered'}</strong>
                    </div>
                    {team.has_idea ? (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Idea</div>
                        <p className={`text-xs leading-relaxed text-slate-700 ${ideaOpen ? '' : 'line-clamp-3'}`}>{idea || 'Not provided'}</p>
                        {idea.length > 140 && (
                          <button
                            type="button"
                            className="mt-1 text-[11px] font-semibold text-gdg-blue hover:underline"
                            onClick={() => setExpandedIdea((s) => ({ ...s, [team.id]: !s[team.id] }))}
                          >
                            {ideaOpen ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-400">No idea yet — deciding at the event</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {(team.members || []).map((m) => (
                    <div key={m.id} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-slate-900">{m.registration?.attendee?.name || 'Member'}</span>
                            {team.captain_registration_id && m.registration_id === team.captain_registration_id && (
                              <span className="shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-900 ring-1 ring-indigo-200/70">Captain</span>
                            )}
                          </div>
                          <div className="truncate text-xs text-slate-500">{m.registration?.attendee?.email}</div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${BUCKET_COLORS[m.role_bucket_snapshot] || BUCKET_COLORS.other}`}>
                          {m.role_bucket_snapshot || 'other'}
                        </span>
                      </div>
                      {team.status !== 'locked' && (
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center gap-1">
                            <select
                              className="ui-input !py-1 !text-xs"
                              value={moveTargetTeam[m.registration_id] || ''}
                              onChange={(e) => setMoveTargetTeam((s) => ({ ...s, [m.registration_id]: e.target.value }))}
                            >
                              <option value="">Move to…</option>
                              {teams.filter((t) => t.id !== team.id && t.status !== 'locked').map((t) => (
                                <option key={t.id} value={t.id}>Team #{t.team_number}</option>
                              ))}
                            </select>
                            <button type="button" disabled={!moveTargetTeam[m.registration_id] || moveMember.isPending} onClick={() => handleMove(m.registration_id)} className="ui-btn-secondary !px-2 !py-1 text-xs disabled:opacity-50">
                              Move
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <select
                              className="ui-input !py-1 !text-xs"
                              value={swapPartner[m.registration_id] || ''}
                              onChange={(e) => setSwapPartner((s) => ({ ...s, [m.registration_id]: e.target.value }))}
                            >
                              <option value="">Swap with…</option>
                              {teams
                                .filter((t) => t.id !== team.id && t.status !== 'locked')
                                .flatMap((t) => (t.members || []).map((tm) => ({ t, tm })))
                                .map(({ t, tm }) => (
                                  <option key={tm.id} value={tm.registration_id}>
                                    Team #{t.team_number} · {tm.registration?.attendee?.name || 'Member'}
                                  </option>
                                ))}
                            </select>
                            <button type="button" disabled={!swapPartner[m.registration_id] || swapMembers.isPending} onClick={() => handleSwap(m.registration_id)} className="ui-btn-secondary !px-2 !py-1 text-xs disabled:opacity-50">
                              Swap
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {(team.members || []).length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">No members yet</div>
                  )}
                </div>

                {failures.length > 0 && (
                  <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900 ring-1 ring-rose-200/70">
                    <div className="mb-1 font-semibold">{failures.length} member(s) could not be updated</div>
                    <ul className="space-y-0.5">
                      {failures.map((f) => (
                        <li key={f.id} className="break-words">
                          <strong className="font-semibold">{memberNameOf(f.id) || f.id}</strong>: {f.error}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="mt-1.5 text-[11px] font-semibold text-rose-700 hover:underline"
                      onClick={() => setStatusFailures((s) => ({ ...s, [team.id]: [] }))}
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="ui-btn-secondary flex-1 !px-3 !py-2 text-xs disabled:opacity-50"
                    disabled={teamBusy}
                    onClick={() => handleTeamStatus(team, RegistrationStatus.SHORTLISTED)}
                  >
                    Shortlist team
                  </button>
                  <button
                    type="button"
                    className="ui-btn-danger flex-1 !px-3 !py-2 text-xs disabled:opacity-50"
                    disabled={teamBusy}
                    onClick={() => handleTeamStatus(team, RegistrationStatus.REJECTED)}
                  >
                    Reject team
                  </button>
                </div>

                {team.status === 'locked' && (
                  <button type="button" className="ui-btn-secondary mt-3 w-full text-xs" onClick={() => unlock.mutateAsync(team.id).then(() => toast.success('Unlocked'))}>
                    Unlock team
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {configOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setConfigOpen(false)}>
          <div className="ui-card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-b-none rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-8" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">Team formation rules</h2>
            {(() => {
              const maxSize = Number(draft.max_team_size) || 0;
              const devTarget = Number(draft.target_developers_per_team) || 0;
              const desTarget = Number(draft.target_designers_per_team) || 0;
              const othTarget = Number(draft.target_others_per_team) || 0;
              const rolesSum = devTarget + desTarget + othTarget;
              const sumMismatch = rolesSum !== maxSize;
              const anyOverMax = devTarget > maxSize || desTarget > maxSize || othTarget > maxSize;
              const minSize = draft.min_team_size == null ? 1 : Number(draft.min_team_size);
              const minInvalid = !Number.isFinite(minSize) || minSize < 1 || minSize > maxSize;
              const configInvalid = sumMismatch || anyOverMax || minInvalid;

              return (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="mb-3">
                      <label className="ui-label-sentence" htmlFor="cfg-max_teams">Max teams</label>
                      <input id="cfg-max_teams" type="number" min={1} className="ui-input" value={draft.max_teams ?? ''} onChange={(e) => setDraft((d) => ({ ...d, max_teams: Number(e.target.value) }))} />
                    </div>
                    <div className="mb-3">
                      <label className="ui-label-sentence" htmlFor="cfg-max_team_size">Max members per team</label>
                      <input id="cfg-max_team_size" type="number" min={1} className="ui-input" value={draft.max_team_size ?? ''} onChange={(e) => setDraft((d) => ({ ...d, max_team_size: Number(e.target.value) }))} />
                    </div>
                    <div className="mb-3">
                      <label className="ui-label-sentence" htmlFor="cfg-min_team_size">Min members per team</label>
                      <input
                        id="cfg-min_team_size"
                        type="number"
                        min={1}
                        max={maxSize || undefined}
                        className={`ui-input ${minInvalid ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
                        value={draft.min_team_size ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, min_team_size: Number(e.target.value) }))}
                      />
                      {minInvalid && <p className="mt-1 text-xs font-medium text-gdg-red">Must be between 1 and max members per team ({maxSize})</p>}
                    </div>
                    {[
                      ['target_developers_per_team', 'Target developers / team', devTarget],
                      ['target_designers_per_team', 'Target designers / team', desTarget],
                      ['target_others_per_team', 'Target others / team', othTarget],
                    ].map(([key, label, val]) => {
                      const over = Number(val) > maxSize;
                      return (
                        <div key={key} className="mb-3">
                          <label className="ui-label-sentence" htmlFor={`cfg-${key}`}>{label}</label>
                          <input
                            id={`cfg-${key}`}
                            type="number"
                            min={0}
                            max={maxSize || undefined}
                            className={`ui-input ${over ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
                            value={draft[key] ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
                          />
                          {over && <p className="mt-1 text-xs font-medium text-gdg-red">Cannot exceed max members per team ({maxSize})</p>}
                        </div>
                      );
                    })}
                  </div>

                  <div className={`mt-1 mb-4 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${sumMismatch ? 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70' : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70'}`}>
                    <span>Role targets sum: <strong>{rolesSum}</strong> of <strong>{maxSize}</strong> slots</span>
                    {sumMismatch
                      ? <span className="text-xs">Must equal {maxSize}</span>
                      : <span className="text-xs">✓ Valid</span>}
                  </div>

                  <div className="mb-4 space-y-3 rounded-lg bg-slate-50/70 px-3 py-3 ring-1 ring-slate-200/60">
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={!!draft.allow_self_registered_teams}
                        onChange={(e) => setDraft((d) => ({ ...d, allow_self_registered_teams: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gdg-blue focus:ring-gdg-blue/30"
                      />
                      <span className="text-sm text-slate-700">Allow public team registration</span>
                    </label>
                    <div>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!draft.allow_team_topup}
                          onChange={(e) => setDraft((d) => ({ ...d, allow_team_topup: e.target.checked }))}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gdg-blue focus:ring-gdg-blue/30"
                        />
                        <span className="text-sm text-slate-700">Let solo attendees fill empty seats in self-registered teams</span>
                      </label>
                      <p className="ml-6 mt-1 text-xs text-slate-400">Off by default so submitted teams stay sealed.</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button type="button" className="ui-btn-secondary" onClick={() => setConfigOpen(false)}>Cancel</button>
                    <button type="button" className="ui-btn-primary" disabled={updateConfig.isPending || configInvalid} onClick={saveConfig}>Save</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
