export function adaptEvent(raw) {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    date: raw.date,
    time: raw.time,
    venue: raw.venue,
    isOnline: raw.is_online ?? raw.isOnline ?? false,
    maxCapacity: raw.max_capacity ?? raw.maxCapacity,
    registeredCount: raw.registered_count ?? raw.registeredCount ?? 0,
    mapLocation: raw.map_location ?? raw.mapLocation ?? null,
    speakers: raw.speakers ?? [],
    specialInstructions: raw.special_instructions ?? raw.specialInstructions ?? null,
    allowExceptions: raw.allow_exceptions ?? raw.allowExceptions ?? true,
    status: raw.status,
    eventTypeId: raw.event_type_id ?? raw.eventTypeId ?? raw.event_type?.id,
    eventType: raw.event_type ?? null,
    eventTypeSlug: raw.event_type?.slug ?? raw.event_type_slug ?? null,
    eventTypeName: raw.event_type?.name ?? raw.event_type_name ?? null,
    tracks: raw.tracks ?? null,
    slots: raw.slots ?? null,
    createdAt: raw.created_at ?? raw.createdAt,
    // Backwards-compat shims for any callers expecting workshop-shaped data
    workshopId: raw.id,
    max_capacity: raw.max_capacity ?? raw.maxCapacity,
    is_online: raw.is_online ?? raw.isOnline ?? false,
    allow_exceptions: raw.allow_exceptions ?? raw.allowExceptions ?? true,
    map_location: raw.map_location ?? raw.mapLocation ?? null,
    special_instructions: raw.special_instructions ?? raw.specialInstructions ?? null,
  };
}

export function adaptEventList(rawList) {
  return rawList.map(adaptEvent);
}
