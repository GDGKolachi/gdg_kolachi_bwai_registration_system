import { HACKATHON_DOMAIN_OPTIONS } from '../registration-constants';

export default function DomainSelect({ value, onChange, error }) {
  return (
    <div className="mb-5">
      <label className="ui-label-sentence" htmlFor="domain">
        Domain (Select the domain you prefer to solve problems in) *
      </label>
      <select
        id="domain"
        name="domain"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`ui-input ${error ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
      >
        <option value="">Select domain</option>
        {HACKATHON_DOMAIN_OPTIONS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      {error && <div className="mt-1 text-xs font-medium text-gdg-red">{error}</div>}
    </div>
  );
}
