// Mirrors the backend: https only (class-validator isURL with protocols: ['https']).
export function isHttpsUrl(value) {
  try {
    const u = new URL(String(value).trim());
    return u.protocol === 'https:' && !!u.hostname && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export function validateEventForm(data) {
  const errors = {};
  if (!data.event_type_id) errors.event_type_id = 'Event type is required';
  if (!data.title?.trim()) errors.title = 'Title is required';
  if (!data.description?.trim()) errors.description = 'Description is required';
  if (!data.date) errors.date = 'Date is required';
  if (!data.time) errors.time = 'Time is required';
  if (!data.venue?.trim()) errors.venue = 'Venue is required';
  if (!data.max_capacity || data.max_capacity < 1) errors.max_capacity = 'Valid capacity is required';
  const claim = data.credits_claim_url?.trim();
  const video = data.credits_video_url?.trim();
  if (data.credits_enabled && !claim) errors.credits_claim_url = 'A claim link is required to send the credits email';
  else if (claim && !isHttpsUrl(claim)) errors.credits_claim_url = 'Must be a valid https:// link';
  if (video && !isHttpsUrl(video)) errors.credits_video_url = 'Must be a valid https:// link';
  return errors;
}
