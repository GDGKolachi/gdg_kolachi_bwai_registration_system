import AttendeeFormFields from './attendee-form-fields';
import ExperienceFields from './experience-fields';
import MotivationField from './motivation-field';

export default function MemberCard({
  index,
  member,
  onChange,
  errors,
  expanded,
  onToggle,
  onRemove,
  canRemove,
}) {
  const isCaptain = index === 0;
  const idPrefix = `m${index}-`;
  const issueCount = Object.keys(errors || {}).length;
  const skillCount = (member.skills || []).length;
  const title = member.name?.trim() || (isCaptain ? 'Team captain' : `Member ${index + 1}`);

  return (
    <div
      className={`ui-card-quiet mb-4 overflow-hidden ${issueCount > 0 ? 'border-rose-200' : ''}`}
    >
      <div className="flex items-start gap-2 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`${idPrefix}panel`}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            className="mt-0.5 shrink-0 text-xs font-semibold text-slate-400"
            aria-hidden
          >
            {expanded ? '▾' : '▸'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-900">{title}</span>
              <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {isCaptain ? 'Captain' : `Member ${index + 1}`}
              </span>
              {issueCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {member.primarySkill || 'No primary skill'} · {skillCount} {skillCount === 1 ? 'skill' : 'skills'}
            </span>
          </span>
        </button>
        {canRemove && !isCaptain && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-gdg-red"
          >
            Remove
          </button>
        )}
      </div>

      {expanded && (
        <div id={`${idPrefix}panel`} className="border-t border-slate-200/80 bg-white px-4 py-5 sm:px-5">
          {isCaptain && (
            <p className="mb-5 rounded-xl bg-sky-50 px-3.5 py-2.5 text-xs leading-relaxed text-sky-900 ring-1 ring-sky-200/70">
              You are registering as the team captain — we will send all team updates to your email.
            </p>
          )}
          <AttendeeFormFields
            formData={member}
            onChange={onChange}
            errors={errors}
            eventTypeSlug="hackathon"
            idPrefix={idPrefix}
            showAmbassador={isCaptain}
          />
          <ExperienceFields
            formData={member}
            onChange={onChange}
            errors={errors}
            variant={isCaptain ? 'full' : 'skills-only'}
            idPrefix={idPrefix}
          />
          {isCaptain && (
            <MotivationField
              value={member.motivation}
              onChange={(val) => onChange({ ...member, motivation: val })}
              error={errors?.motivation}
              eventTypeSlug="hackathon"
            />
          )}
        </div>
      )}
    </div>
  );
}
