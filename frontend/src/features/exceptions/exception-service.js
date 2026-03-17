export function validateExceptionForm(data) {
  const errors = {};
  if (!data.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email format';
  if (!data.reason?.trim()) errors.reason = 'Reason is required';
  if (data.reason && data.reason.trim().length < 20) errors.reason = 'Please provide a more detailed reason (at least 20 characters)';
  return errors;
}
