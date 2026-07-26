import {
  YEARS_EXPERIENCE_OPTIONS,
  PRIOR_HACKATHON_OPTIONS,
  SKILL_OPTIONS,
  MAX_SKILLS,
  AI_EXPERIENCE_OPTIONS,
  MAX_BEST_PROJECT_LENGTH,
} from '../registration-constants';

const errorCls = 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15';

// Skill labels contain spaces and slashes — ids must not.
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ExperienceFields({ formData, onChange, errors, variant = 'full', idPrefix = '' }) {
  const skills = formData.skills || [];
  const skillsFull = skills.length >= MAX_SKILLS;

  const setField = (name, value) => {
    onChange({ ...formData, [name]: value });
  };

  const toggleSkill = (skill) => {
    const next = skills.includes(skill)
      ? skills.filter((s) => s !== skill)
      : skills.length >= MAX_SKILLS
        ? skills
        : [...skills, skill];
    onChange({ ...formData, skills: next });
  };

  const bestProject = formData.bestProject || '';
  const isOverLimit = bestProject.length > MAX_BEST_PROJECT_LENGTH;
  const isNearLimit = bestProject.length > MAX_BEST_PROJECT_LENGTH * 0.9;

  const skillsBlock = (
    <div className="mb-5">
      <span className="ui-label-sentence" id={`${idPrefix}skills-label`}>
        Primary skills * <span className="font-normal text-slate-500">(pick up to {MAX_SKILLS})</span>
      </span>
      <div
        role="group"
        aria-labelledby={`${idPrefix}skills-label`}
        className={`grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-2 ${
          errors?.skills ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-white'
        }`}
      >
        {SKILL_OPTIONS.map((skill) => {
          const checked = skills.includes(skill);
          const disabled = !checked && skillsFull;
          const skillId = `${idPrefix}skill-${slugify(skill)}`;
          return (
            <label
              key={skill}
              htmlFor={skillId}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                checked
                  ? 'border-gdg-blue bg-gdg-blue/5 font-medium text-slate-900'
                  : disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-gdg-blue/50'
              }`}
            >
              <input
                id={skillId}
                type="checkbox"
                name={`${idPrefix}skills`}
                value={skill}
                checked={checked}
                disabled={disabled}
                onChange={() => toggleSkill(skill)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-gdg-blue focus:ring-gdg-blue/30 disabled:cursor-not-allowed"
              />
              {skill}
            </label>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        {errors?.skills ? (
          <div className="text-xs font-medium text-gdg-red">{errors.skills}</div>
        ) : (
          <span />
        )}
        <span className={`text-xs tabular-nums ${skillsFull ? 'font-medium text-amber-600' : 'text-slate-400'}`}>
          {skills.length} of {MAX_SKILLS} selected
        </span>
      </div>
    </div>
  );

  if (variant === 'skills-only') return skillsBlock;

  return (
    <>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}yearsExperience`}>
          Years of experience *
        </label>
        <select
          id={`${idPrefix}yearsExperience`}
          name="yearsExperience"
          value={formData.yearsExperience || ''}
          onChange={(e) => setField('yearsExperience', e.target.value)}
          className={`ui-input ${errors?.yearsExperience ? errorCls : ''}`}
        >
          <option value="">Select experience</option>
          {YEARS_EXPERIENCE_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {errors?.yearsExperience && (
          <div className="mt-1 text-xs font-medium text-gdg-red">{errors.yearsExperience}</div>
        )}
      </div>

      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}priorHackathons`}>
          How many hackathons have you taken part in before? *
        </label>
        <select
          id={`${idPrefix}priorHackathons`}
          name="priorHackathons"
          value={formData.priorHackathons || ''}
          onChange={(e) => setField('priorHackathons', e.target.value)}
          className={`ui-input ${errors?.priorHackathons ? errorCls : ''}`}
        >
          <option value="">Select an option</option>
          {PRIOR_HACKATHON_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {errors?.priorHackathons && (
          <div className="mt-1 text-xs font-medium text-gdg-red">{errors.priorHackathons}</div>
        )}
      </div>

      {skillsBlock}

      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}aiExperience`}>
          Have you built anything with AI before?
        </label>
        <select
          id={`${idPrefix}aiExperience`}
          name="aiExperience"
          value={formData.aiExperience || ''}
          onChange={(e) => setField('aiExperience', e.target.value)}
          className={`ui-input ${errors?.aiExperience ? errorCls : ''}`}
        >
          <option value="">Select an option (optional)</option>
          {AI_EXPERIENCE_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {errors?.aiExperience && (
          <div className="mt-1 text-xs font-medium text-gdg-red">{errors.aiExperience}</div>
        )}
      </div>

      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}portfolioUrl`}>
          Portfolio or personal site
        </label>
        <input
          id={`${idPrefix}portfolioUrl`}
          name="portfolioUrl"
          type="url"
          value={formData.portfolioUrl || ''}
          onChange={(e) => setField('portfolioUrl', e.target.value)}
          placeholder="https://yoursite.com"
          className={`ui-input ${errors?.portfolioUrl ? errorCls : ''}`}
        />
        <p className="mt-1.5 text-xs text-slate-500">Optional — a portfolio, Devpost, Behance, or personal site.</p>
        {errors?.portfolioUrl && (
          <div className="mt-1 text-xs font-medium text-gdg-red">{errors.portfolioUrl}</div>
        )}
      </div>

      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}bestProject`}>
          What is the best thing you have built? *
        </label>
        <textarea
          id={`${idPrefix}bestProject`}
          name="bestProject"
          value={bestProject}
          onChange={(e) => setField('bestProject', e.target.value)}
          placeholder="Describe the project, your role in it, and what made it work…"
          rows={4}
          maxLength={MAX_BEST_PROJECT_LENGTH + 100}
          className={`ui-input min-h-28 resize-y ${errors?.bestProject ? errorCls : ''}`}
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          {errors?.bestProject ? (
            <div className="text-xs font-medium text-gdg-red">{errors.bestProject}</div>
          ) : (
            <span />
          )}
          <span
            className={`text-xs tabular-nums ${
              isOverLimit ? 'font-medium text-gdg-red' : isNearLimit ? 'text-amber-600' : 'text-slate-400'
            }`}
          >
            {bestProject.length} / {MAX_BEST_PROJECT_LENGTH}
          </span>
        </div>
      </div>
    </>
  );
}
