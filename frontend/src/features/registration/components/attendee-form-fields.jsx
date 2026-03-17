export default function AttendeeFormFields({ formData, onChange, errors }) {
  const handleChange = (e) => {
    onChange({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <div className="form-group">
        <label>Full Name *</label>
        <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="Enter your full name" />
        {errors.name && <div className="form-error">{errors.name}</div>}
      </div>
      <div className="form-group">
        <label>Email *</label>
        <input name="email" type="email" value={formData.email || ''} onChange={handleChange} placeholder="your@email.com" />
        {errors.email && <div className="form-error">{errors.email}</div>}
      </div>
      <div className="form-group">
        <label>Phone Number *</label>
        <input name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="+92 300 1234567" />
        {errors.phone && <div className="form-error">{errors.phone}</div>}
      </div>
      <div className="form-group">
        <label>University / Organization *</label>
        <input name="universityOrg" value={formData.universityOrg || ''} onChange={handleChange} placeholder="Your university or organization" />
        {errors.universityOrg && <div className="form-error">{errors.universityOrg}</div>}
      </div>
      <div className="form-group">
        <label>GitHub / LinkedIn Profile</label>
        <input name="githubLinkedin" value={formData.githubLinkedin || ''} onChange={handleChange} placeholder="https://github.com/yourprofile" />
      </div>
      <div className="form-group">
        <label>CNIC / National ID *</label>
        <input name="cnic" value={formData.cnic || ''} onChange={handleChange} placeholder="12345-1234567-1" />
        {errors.cnic && <div className="form-error">{errors.cnic}</div>}
      </div>
    </>
  );
}
