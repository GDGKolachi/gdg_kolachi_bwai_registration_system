export default function MotivationField({ value, onChange, error }) {
  return (
    <div className="mb-6">
      <label className="ui-label-sentence" htmlFor="motivation">
        Why do you want to attend this workshop? *
      </label>
      <textarea
        id="motivation"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Tell us what motivates you and what you hope to learn…"
        rows={4}
        className={`ui-input min-h-28 resize-y ${error ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
      />
      {error && <div className="mt-1 text-xs font-medium text-gdg-red">{error}</div>}
    </div>
  );
}
