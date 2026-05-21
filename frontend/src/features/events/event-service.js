export function isEventFull(event) {
  return event.registeredCount >= event.maxCapacity;
}

export function isRegistrationOpen(event) {
  return (event.status === 'open' || event.status === 'registration_open') && !isEventFull(event);
}

export function getCapacityPercentage(event) {
  if (!event.maxCapacity) return 0;
  return Math.round((event.registeredCount / event.maxCapacity) * 100);
}

export function getStatusLabel(status) {
  const labels = {
    upcoming: 'Upcoming',
    open: 'Open',
    registration_open: 'Open',
    closed: 'Closed',
    completed: 'Completed',
    disabled: 'Disabled',
  };
  return labels[status] || status;
}

export const EVENT_TYPE_SLUG = {
  WORKSHOP: 'workshop',
  TALKS: 'talks',
  COMMUNITY_LOUNGE: 'community-lounge',
  HACKATHON: 'hackathon',
};

export function eventTypeLabel(event) {
  return event?.eventTypeName || 'Event';
}

// Backwards-compat aliases
export const isWorkshopFull = isEventFull;
