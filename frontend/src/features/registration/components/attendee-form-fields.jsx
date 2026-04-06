export default function AttendeeFormFields({ formData, onChange, errors }) {
  const handleChange = (e) => {
    onChange({ ...formData, [e.target.name]: e.target.value });
  };

  const inputCls = "w-full px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15";

  return (
    <>
      <div className="mb-5">
        <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Full Name *</label>
        <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="Enter your full name" className={inputCls} />
        {errors.name && <div className="text-gdg-red text-xs mt-1">{errors.name}</div>}
      </div>
      <div className="mb-5">
        <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Email *</label>
        <input name="email" type="email" value={formData.email || ''} onChange={handleChange} placeholder="your@email.com" className={inputCls} />
        {errors.email && <div className="text-gdg-red text-xs mt-1">{errors.email}</div>}
      </div>
      <div className="mb-5">
        <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Phone Number *</label>
        <input name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="+92 300 1234567" className={inputCls} />
        <p className="text-xs text-gdg-gray mt-1">Format: +92 300 1234567 or 03001234567</p>
        {errors.phone && <div className="text-gdg-red text-xs mt-1">{errors.phone}</div>}
      </div>
      <div className="mb-5">
        <label className="block mb-1.5 font-medium text-sm text-gdg-dark">University / Organization *</label>
        <input name="universityOrg" value={formData.universityOrg || ''} onChange={handleChange} placeholder="Your university or organization" className={inputCls} />
        {errors.universityOrg && <div className="text-gdg-red text-xs mt-1">{errors.universityOrg}</div>}
      </div>
      <div className="mb-5">
        <label className="block mb-1.5 font-medium text-sm text-gdg-dark">LinkedIn Profile *</label>
        <input name="linkedin" value={formData.linkedin || ''} onChange={handleChange} placeholder="https://linkedin.com/in/yourprofile" className={inputCls} />
        {errors.linkedin && <div className="text-gdg-red text-xs mt-1">{errors.linkedin}</div>}
      </div>
      <div className="mb-5">
        <label className="block mb-1.5 font-medium text-sm text-gdg-dark">GitHub Profile</label>
        <input name="github" value={formData.github || ''} onChange={handleChange} placeholder="https://github.com/yourprofile" className={inputCls} />
      </div>
      <div className="mb-5">
        <label className="block mb-1.5 font-medium text-sm text-gdg-dark">CNIC / National ID *</label>
        <input name="cnic" value={formData.cnic || ''} onChange={handleChange} placeholder="12345-1234567-1" className={inputCls} />
        {errors.cnic && <div className="text-gdg-red text-xs mt-1">{errors.cnic}</div>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="mb-5">
          <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Gender *</label>
          <select name="gender" value={formData.gender || ''} onChange={handleChange} className={inputCls}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-Binary">Non-Binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          {errors.gender && <div className="text-gdg-red text-xs mt-1">{errors.gender}</div>}
        </div>
        <div className="mb-5">
          <label className="block mb-1.5 font-medium text-sm text-gdg-dark">What defines you best? *</label>
          <select name="definesYouBest" value={formData.definesYouBest || ''} onChange={handleChange} className={inputCls}>
            <option value="">Select option</option>
            <option value="Student">Student</option>
            <option value="Young Professional">Young Professional</option>
            <option value="Intermediate Expert">Intermediate Expert</option>
            <option value="Senior Expert">Senior Expert</option>
            <option value="Freelancer">Freelancer</option>
            <option value="Other">Other</option>
          </select>
          {errors.definesYouBest && <div className="text-gdg-red text-xs mt-1">{errors.definesYouBest}</div>}
        </div>
      </div>
    </>
  );
}
