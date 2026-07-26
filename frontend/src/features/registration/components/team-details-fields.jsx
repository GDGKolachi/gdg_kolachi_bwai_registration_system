import {
  HACKATHON_DOMAIN_OPTIONS,
  WORKED_TOGETHER_OPTIONS,
  MAX_IDEA_DESCRIPTION_LENGTH,
} from '../registration-constants';

const errorCls = 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15';

export default function TeamDetailsFields({ team, onChange, errors }) {
  const setField = (name, value) => {
    onChange({ ...team, [name]: value });
  };

  const idea = team.ideaDescription || '';
  const isOverLimit = idea.length > MAX_IDEA_DESCRIPTION_LENGTH;
  const isNearLimit = idea.length > MAX_IDEA_DESCRIPTION_LENGTH * 0.9;

  return (
    <>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor="teamName">
          Team name *
        </label>
        <input
          id="teamName"
          name="teamName"
          value={team.name || ''}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="e.g. Kolachi Coders"
          className={`ui-input ${errors?.name ? errorCls : ''}`}
        />
        {errors?.name && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.name}</div>}
      </div>

      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor="teamDomain">
          Domain your team wants to solve problems in *
        </label>
        <select
          id="teamDomain"
          name="teamDomain"
          value={team.domain || ''}
          onChange={(e) => setField('domain', e.target.value)}
          className={`ui-input ${errors?.domain ? errorCls : ''}`}
        >
          <option value="">Select domain</option>
          {HACKATHON_DOMAIN_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-slate-500">One domain applies to the whole team.</p>
        {errors?.domain && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.domain}</div>}
      </div>

      <div className="mb-5">
        <span className="ui-label-sentence" id="hasIdea-label">
          Do you already have an idea? *
        </span>
        <div role="radiogroup" aria-labelledby="hasIdea-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            htmlFor="hasIdea-yes"
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition ${
              team.hasIdea === true
                ? 'border-gdg-blue bg-gdg-blue/5 font-medium text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-gdg-blue/50'
            }`}
          >
            <input
              id="hasIdea-yes"
              type="radio"
              name="hasIdea"
              checked={team.hasIdea === true}
              onChange={() => setField('hasIdea', true)}
              className="h-4 w-4 shrink-0 border-slate-300 text-gdg-blue focus:ring-gdg-blue/30"
            />
            Yes, we have an idea
          </label>
          <label
            htmlFor="hasIdea-no"
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition ${
              team.hasIdea === false
                ? 'border-gdg-blue bg-gdg-blue/5 font-medium text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-gdg-blue/50'
            }`}
          >
            <input
              id="hasIdea-no"
              type="radio"
              name="hasIdea"
              checked={team.hasIdea === false}
              onChange={() => setField('hasIdea', false)}
              className="h-4 w-4 shrink-0 border-slate-300 text-gdg-blue focus:ring-gdg-blue/30"
            />
            No, we&apos;ll decide at the event
          </label>
        </div>
        {errors?.hasIdea && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.hasIdea}</div>}
      </div>

      {team.hasIdea === true && (
        <div className="mb-5">
          <label className="ui-label-sentence" htmlFor="ideaDescription">
            Describe your idea *
          </label>
          <textarea
            id="ideaDescription"
            name="ideaDescription"
            value={idea}
            onChange={(e) => setField('ideaDescription', e.target.value)}
            placeholder="What problem are you solving, and how do you plan to build it?"
            rows={4}
            maxLength={MAX_IDEA_DESCRIPTION_LENGTH + 100}
            className={`ui-input min-h-28 resize-y ${errors?.ideaDescription ? errorCls : ''}`}
          />
          <div className="mt-1.5 flex items-center justify-between gap-3">
            {errors?.ideaDescription ? (
              <div className="text-xs font-medium text-gdg-red">{errors.ideaDescription}</div>
            ) : (
              <span />
            )}
            <span
              className={`text-xs tabular-nums ${
                isOverLimit ? 'font-medium text-gdg-red' : isNearLimit ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {idea.length} / {MAX_IDEA_DESCRIPTION_LENGTH}
            </span>
          </div>
        </div>
      )}

      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor="workedTogether">
          Has your team worked together before? *
        </label>
        <select
          id="workedTogether"
          name="workedTogether"
          value={team.workedTogether || ''}
          onChange={(e) => setField('workedTogether', e.target.value)}
          className={`ui-input ${errors?.workedTogether ? errorCls : ''}`}
        >
          <option value="">Select an option</option>
          {WORKED_TOGETHER_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {errors?.workedTogether && (
          <div className="mt-1 text-xs font-medium text-gdg-red">{errors.workedTogether}</div>
        )}
      </div>
    </>
  );
}
