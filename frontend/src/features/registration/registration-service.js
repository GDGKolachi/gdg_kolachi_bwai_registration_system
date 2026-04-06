const PHONE_REGEX = /^(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?\d{6,14}$/;

export function validateRegistrationForm(data) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Full name is required';
  if (!data.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email format';
  if (!data.phone?.trim()) errors.phone = 'Phone number is required';
  else if (!PHONE_REGEX.test(data.phone.replace(/\s/g, ''))) errors.phone = 'Please enter a valid phone number (e.g. +92 300 1234567)';
  if (!data.universityOrg?.trim()) errors.universityOrg = 'University/Organization is required';
  if (!data.linkedin?.trim()) errors.linkedin = 'LinkedIn profile is required';
  if (!data.cnic?.trim()) errors.cnic = 'CNIC/National ID is required';
  if (!data.gender) errors.gender = 'Gender is required';
  if (!data.definesYouBest) errors.definesYouBest = 'This field is required';
  if (!data.motivation?.trim()) errors.motivation = 'Motivation is required';
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
