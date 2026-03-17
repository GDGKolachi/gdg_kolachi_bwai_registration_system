export function adaptWorkshop(raw) {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    date: raw.date,
    time: raw.time,
    venue: raw.venue,
    maxCapacity: raw.max_capacity ?? raw.maxCapacity,
    registeredCount: raw.registered_count ?? raw.registeredCount ?? 0,
    status: raw.status,
    createdAt: raw.created_at ?? raw.createdAt,
  };
}

export function adaptWorkshopList(rawList) {
  return rawList.map(adaptWorkshop);
}
