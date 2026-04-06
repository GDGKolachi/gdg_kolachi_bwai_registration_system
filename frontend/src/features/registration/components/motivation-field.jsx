export default function MotivationField({ value, onChange, error }) {
  return (
    <div className="mb-5">
      <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Why do you want to attend this workshop? *</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tell us what motivates you to attend and what you hope to learn..."
        rows={4}
        className="w-full px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15 resize-y min-h-24"
      />
      {error && <div className="text-gdg-red text-xs mt-1">{error}</div>}
    </div>
  );
}
