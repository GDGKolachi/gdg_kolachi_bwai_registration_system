export function isWorkshopFull(workshop) {
  return workshop.registeredCount >= workshop.maxCapacity;
}

export function isRegistrationOpen(workshop) {
  return workshop.status === 'open' && !isWorkshopFull(workshop);
}

export function getCapacityPercentage(workshop) {
  if (!workshop.maxCapacity) return 0;
  return Math.round((workshop.registeredCount / workshop.maxCapacity) * 100);
}

export function getStatusLabel(status) {
  const labels = {
    upcoming: 'Upcoming',
    open: 'Open',
    closed: 'Closed',
    completed: 'Completed',
  };
  return labels[status] || status;
}
