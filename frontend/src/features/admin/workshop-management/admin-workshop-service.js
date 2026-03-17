export function validateWorkshopForm(data) {
  const errors = {};
  if (!data.title?.trim()) errors.title = 'Title is required';
  if (!data.description?.trim()) errors.description = 'Description is required';
  if (!data.date) errors.date = 'Date is required';
  if (!data.time) errors.time = 'Time is required';
  if (!data.venue?.trim()) errors.venue = 'Venue is required';
  if (!data.max_capacity || data.max_capacity < 1) errors.max_capacity = 'Valid capacity is required';
  return errors;
}
