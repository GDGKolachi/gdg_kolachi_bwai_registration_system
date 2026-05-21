import { motivationLabelFor, motivationPlaceholderFor } from '../registration-constants';

const MAX_CHARS = 2000;

export default function MotivationField({ value, onChange, error, eventTypeSlug }) {
  const charCount = (value || '').length;
  const isNearLimit = charCount > MAX_CHARS * 0.9;
  const isOverLimit = charCount > MAX_CHARS;

  const label = motivationLabelFor(eventTypeSlug);
  if (label === null) return null;

  return (
    <div className="mb-6">
      <label className="ui-label-sentence" htmlFor="motivation">
        {label}
      </label>
      <textarea
        id="motivation"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={motivationPlaceholderFor(eventTypeSlug)}
        rows={4}
        maxLength={MAX_CHARS + 100}
        className={`ui-input min-h-28 resize-y ${error ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
      />
      <div className="mt-1.5 flex items-center justify-between">
        {error ? (
          <div className="text-xs font-medium text-gdg-red">{error}</div>
        ) : (
          <span />
        )}
        <span
          className={`text-xs tabular-nums ${
            isOverLimit ? 'font-medium text-gdg-red' : isNearLimit ? 'text-amber-600' : 'text-slate-400'
          }`}
        >
          {charCount} / {MAX_CHARS}
        </span>
      </div>
    </div>
  );
}
