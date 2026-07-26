import { rolesForEventType } from '../registration-constants';

function formatPhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return digits.slice(0, 4) + '-' + digits.slice(4, 11);
}

function formatCnic(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return digits.slice(0, 5) + '-' + digits.slice(5);
  return digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12, 13);
}

export default function AttendeeFormFields({
  formData,
  onChange,
  errors,
  eventTypeSlug,
  idPrefix = '',
  showAmbassador = true,
}) {
  const roleOptions = rolesForEventType(eventTypeSlug);

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'phone') {
      onChange({ ...formData, phone: formatPhone(value) });
    } else if (name === 'cnic') {
      onChange({ ...formData, cnic: formatCnic(value) });
    } else {
      onChange({ ...formData, [name]: value });
    }
  };

  const inputCls = 'ui-input';

  return (
    <>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}name`}>
          Full name *
        </label>
        <input
          id={`${idPrefix}name`}
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          placeholder="Enter your full name"
          className={`${inputCls} ${errors?.name ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        {errors?.name && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.name}</div>}
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}email`}>
          Email *
        </label>
        <input
          id={`${idPrefix}email`}
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={handleChange}
          placeholder="you@example.com"
          className={`${inputCls} ${errors?.email ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        {errors?.email && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.email}</div>}
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}phone`}>
          Phone number *
        </label>
        <input
          id={`${idPrefix}phone`}
          name="phone"
          value={formData.phone || ''}
          onChange={handleChange}
          placeholder="03XX-XXXXXXX"
          maxLength={12}
          className={`${inputCls} ${errors?.phone ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        <p className="mt-1.5 text-xs text-slate-500">Pakistani mobile number, e.g. 0312-3456789</p>
        {errors?.phone && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.phone}</div>}
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}universityOrg`}>
          Organization *
        </label>
        <input
          id={`${idPrefix}universityOrg`}
          name="universityOrg"
          value={formData.universityOrg || ''}
          onChange={handleChange}
          placeholder="e.g. Google, FAST NUCES, Freelance"
          className={`${inputCls} ${errors?.universityOrg ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        <p className="mt-1.5 text-xs text-slate-500">Company name, university, or &quot;Freelance&quot; if self-employed</p>
        {errors?.universityOrg && (
          <div className="mt-1 text-xs font-medium text-gdg-red">{errors.universityOrg}</div>
        )}
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}linkedin`}>
          LinkedIn profile *
        </label>
        <input
          id={`${idPrefix}linkedin`}
          name="linkedin"
          value={formData.linkedin || ''}
          onChange={handleChange}
          placeholder="https://linkedin.com/in/yourprofile"
          className={`${inputCls} ${errors?.linkedin ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        {errors?.linkedin && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.linkedin}</div>}
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}github`}>
          GitHub profile
        </label>
        <input
          id={`${idPrefix}github`}
          name="github"
          value={formData.github || ''}
          onChange={handleChange}
          placeholder="https://github.com/yourprofile"
          className={inputCls}
        />
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor={`${idPrefix}cnic`}>
          CNIC / national ID *
        </label>
        <input
          id={`${idPrefix}cnic`}
          name="cnic"
          value={formData.cnic || ''}
          onChange={handleChange}
          placeholder="XXXXX-XXXXXXX-X"
          maxLength={15}
          className={`${inputCls} ${errors?.cnic ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        <p className="mt-1.5 text-xs text-slate-500">13 digits, e.g. 42101-1234567-1</p>
        {errors?.cnic && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.cnic}</div>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="mb-5 sm:mb-0">
          <label className="ui-label-sentence" htmlFor={`${idPrefix}gender`}>
            Gender *
          </label>
          <select
            id={`${idPrefix}gender`}
            name="gender"
            value={formData.gender || ''}
            onChange={handleChange}
            className={`${inputCls} ${errors?.gender ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-Binary">Non-Binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          {errors?.gender && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.gender}</div>}
        </div>
        <div className="mb-5">
          <label className="ui-label-sentence" htmlFor={`${idPrefix}bestDescribesYou`}>
            What best describes you? *
          </label>
          <select
            id={`${idPrefix}bestDescribesYou`}
            name="bestDescribesYou"
            value={formData.bestDescribesYou || ''}
            onChange={handleChange}
            className={`${inputCls} ${errors?.bestDescribesYou ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
          >
            <option value="">Select option</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors?.bestDescribesYou && (
            <div className="mt-1 text-xs font-medium text-gdg-red">{errors.bestDescribesYou}</div>
          )}
        </div>
      </div>
      {showAmbassador && (
        <div className="mb-5 mt-5">
          <label className="ui-label-sentence" htmlFor={`${idPrefix}ambassador`}>
            Referred by (Ambassador)
          </label>
          <input
            id={`${idPrefix}ambassador`}
            name="ambassador"
            value={formData.ambassador || ''}
            onChange={handleChange}
            placeholder="Name of the ambassador who referred you (optional)"
            className={inputCls}
          />
          <p className="mt-1.5 text-xs text-slate-500">Optional — leave blank if no one referred you.</p>
        </div>
      )}
    </>
  );
}
