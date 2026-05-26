export function adaptException(raw) {
  return {
    id: raw.id,
    attendeeId: raw.attendee_id ?? raw.attendeeId,
    requestedEventId:
      raw.requested_event_id ?? raw.requestedEventId ?? raw.requested_workshop_id ?? raw.requestedWorkshopId,
    reason: raw.reason,
    status: raw.status,
    reviewedAt: raw.reviewed_at ?? raw.reviewedAt,
    createdAt: raw.created_at ?? raw.createdAt,
  };
}
