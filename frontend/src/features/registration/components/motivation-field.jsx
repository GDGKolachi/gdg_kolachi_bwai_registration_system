export default function MotivationField({ value, onChange, error }) {
  return (
    <div className="form-group">
      <label>Why do you want to attend this workshop? *</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tell us what motivates you to attend and what you hope to learn..."
        rows={4}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
