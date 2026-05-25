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
} from '../teams-repository';

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

export default function TeamsManagement() {
  const { eventId } = useParams();
  const { data: teams = [], isLoading } = useTeams(eventId);
  const { data: config } = useTeamFormationConfig(eventId);
  const updateConfig = useUpdateTeamFormationConfig(eventId);
  const lock = useLockTeams(eventId);
  const unlock = useUnlockTeam(eventId);
  const moveMember = useMoveMember(eventId);

  const [configOpen, setConfigOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [moveTargetTeam, setMoveTargetTeam] = useState({});

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
          {teams.map((team) => (
            <div key={team.id} className="ui-card p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team</div>
                  <div className="text-2xl font-bold text-slate-900">#{team.team_number}{team.name ? ` · ${team.name}` : ''}</div>
                  {team.primary_domain && (
                    <div className="mt-1 text-xs text-slate-600">Domain: <strong>{team.primary_domain}</strong></div>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${team.status === 'locked' ? 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70' : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70'}`}>
                  {team.status}
                </span>
              </div>

              <div className="space-y-2">
                {(team.members || []).map((m) => (
                  <div key={m.id} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{m.registration?.attendee?.name || 'Member'}</div>
                        <div className="truncate text-xs text-slate-500">{m.registration?.attendee?.email}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${BUCKET_COLORS[m.role_bucket_snapshot] || BUCKET_COLORS.other}`}>
                        {m.role_bucket_snapshot || 'other'}
                      </span>
                    </div>
                    {team.status !== 'locked' && (
                      <div className="mt-2 flex items-center gap-1">
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
                    )}
                  </div>
                ))}
                {(team.members || []).length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">No members yet</div>
                )}
              </div>

              {team.status === 'locked' && (
                <button type="button" className="ui-btn-secondary mt-3 w-full text-xs" onClick={() => unlock.mutateAsync(team.id).then(() => toast.success('Unlocked'))}>
                  Unlock team
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {configOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setConfigOpen(false)}>
          <div className="ui-card max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-b-none rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-8" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">Team formation rules</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['max_teams', 'Max teams'],
                ['max_team_size', 'Max members per team'],
                ['target_developers_per_team', 'Target developers / team'],
                ['target_designers_per_team', 'Target designers / team'],
                ['target_others_per_team', 'Target others / team'],
              ].map(([key, label]) => (
                <div key={key} className="mb-3">
                  <label className="ui-label-sentence" htmlFor={`cfg-${key}`}>{label}</label>
                  <input id={`cfg-${key}`} type="number" className="ui-input" value={draft[key] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" className="ui-btn-secondary" onClick={() => setConfigOpen(false)}>Cancel</button>
              <button type="button" className="ui-btn-primary" disabled={updateConfig.isPending} onClick={saveConfig}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
