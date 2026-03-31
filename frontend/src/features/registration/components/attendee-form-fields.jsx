export default function AttendeeFormFields({ formData, onChange, errors }) {
  const handleChange = e => {
    onChange({ ...formData, [e.target.name]: e.target.value });
  };

  const inputCls = 'ui-input';

  return (
    <>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor="name">
          Full name *
        </label>
        <input
          id="name"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          placeholder="Enter your full name"
          className={`${inputCls} ${errors?.name ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        {errors?.name && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.name}</div>}
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor="email">
          Email *
        </label>
        <input
          id="email"
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
        <label className="ui-label-sentence" htmlFor="phone">
          Phone number *
        </label>
        <input
          id="phone"
          name="phone"
          value={formData.phone || ''}
          onChange={handleChange}
          placeholder="+92 300 1234567"
          className={`${inputCls} ${errors?.phone ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        <p className="mt-1.5 text-xs text-slate-500">e.g. +92 300 1234567 or 03001234567</p>
        {errors?.phone && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.phone}</div>}
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor="universityOrg">
          University / organization *
        </label>
        <input
          id="universityOrg"
          name="universityOrg"
          value={formData.universityOrg || ''}
          onChange={handleChange}
          placeholder="Your university or organization"
          className={`${inputCls} ${errors?.universityOrg ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        {errors?.universityOrg && (
          <div className="mt-1 text-xs font-medium text-gdg-red">{errors.universityOrg}</div>
        )}
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor="linkedin">
          LinkedIn profile *
        </label>
        <input
          id="linkedin"
          name="linkedin"
          value={formData.linkedin || ''}
          onChange={handleChange}
          placeholder="https://linkedin.com/in/yourprofile"
          className={`${inputCls} ${errors?.linkedin ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        {errors?.linkedin && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.linkedin}</div>}
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor="github">
          GitHub profile
        </label>
        <input
          id="github"
          name="github"
          value={formData.github || ''}
          onChange={handleChange}
          placeholder="https://github.com/yourprofile"
          className={inputCls}
        />
      </div>
      <div className="mb-5">
        <label className="ui-label-sentence" htmlFor="cnic">
          CNIC / national ID *
        </label>
        <input
          id="cnic"
          name="cnic"
          value={formData.cnic || ''}
          onChange={handleChange}
          placeholder="12345-1234567-1"
          className={`${inputCls} ${errors?.cnic ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
        />
        {errors?.cnic && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.cnic}</div>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="mb-5 sm:mb-0">
          <label className="ui-label-sentence" htmlFor="gender">
            Gender *
          </label>
          <select
            id="gender"
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
          <label className="ui-label-sentence" htmlFor="definesYouBest">
            What defines you best? *
          </label>
          <select
            id="definesYouBest"
            name="definesYouBest"
            value={formData.definesYouBest || ''}
            onChange={handleChange}
            className={`${inputCls} ${errors?.definesYouBest ? 'border-rose-300 focus:border-gdg-red focus:ring-gdg-red/15' : ''}`}
          >
            <option value="">Select option</option>
            <option value="Student">Student</option>
            <option value="Young Professional">Young Professional</option>
            <option value="Intermediate Expert">Intermediate Expert</option>
            <option value="Senior Expert">Senior Expert</option>
            <option value="Freelancer">Freelancer</option>
            <option value="Other">Other</option>
          </select>
          {errors?.definesYouBest && (
            <div className="mt-1 text-xs font-medium text-gdg-red">{errors.definesYouBest}</div>
          )}
        </div>
      </div>
    </>
  );
}
