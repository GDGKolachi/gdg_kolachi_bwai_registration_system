export function TrackSelect({ tracks, value, onChange, error }) {
  return (
    <div className="mb-5">
      <label className="ui-label-sentence" htmlFor="track">
        Track *
      </label>
      <select
        id="track"
        name="track"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`ui-input ${error ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
      >
        <option value="">Select track</option>
        {(tracks || []).map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {error && <div className="mt-1 text-xs font-medium text-gdg-red">{error}</div>}
    </div>
  );
}

export function SlotSelect({ slots, value, onChange, error }) {
  return (
    <div className="mb-5">
      <label className="ui-label-sentence" htmlFor="slot">
        Slot *
      </label>
      <select
        id="slot"
        name="slot"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`ui-input ${error ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
      >
        <option value="">Select slot</option>
        {(slots || []).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {error && <div className="mt-1 text-xs font-medium text-gdg-red">{error}</div>}
    </div>
  );
}
