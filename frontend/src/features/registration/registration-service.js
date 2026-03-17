export function validateRegistrationForm(data) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Full name is required';
  if (!data.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email format';
  if (!data.phone?.trim()) errors.phone = 'Phone number is required';
  if (!data.universityOrg?.trim()) errors.universityOrg = 'University/Organization is required';
  if (!data.cnic?.trim()) errors.cnic = 'CNIC/National ID is required';
  if (!data.motivation?.trim()) errors.motivation = 'Motivation is required';
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
