const PHONE_REGEX = /^(03\d{9}|\+923\d{9})$/;
const CNIC_REGEX = /^\d{13}$/;

export function validateRegistrationForm(data) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Full name is required';
  if (!data.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email format';
  if (!data.phone?.trim()) errors.phone = 'Phone number is required';
  else {
    const digits = data.phone.replace(/[\s\-()]/g, '');
    if (!PHONE_REGEX.test(digits)) errors.phone = 'Enter a valid Pakistani phone number (e.g. 03XX-XXXXXXX)';
  }
  if (!data.universityOrg?.trim()) errors.universityOrg = 'University/Organization is required';
  if (!data.linkedin?.trim()) errors.linkedin = 'LinkedIn profile is required';
  if (!data.cnic?.trim()) errors.cnic = 'CNIC/National ID is required';
  else {
    const cnicDigits = data.cnic.replace(/[\s\-]/g, '');
    if (!CNIC_REGEX.test(cnicDigits)) errors.cnic = 'CNIC must be exactly 13 digits (e.g. XXXXX-XXXXXXX-X)';
  }
  if (!data.gender) errors.gender = 'Gender is required';
  if (!data.definesYouBest) errors.definesYouBest = 'This field is required';
  if (!data.motivation?.trim()) errors.motivation = 'Motivation is required';
  else if (data.motivation.trim().length > 2000) errors.motivation = 'Please keep your response under 2000 characters';
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
