export function adaptRegistration(raw) {
  return {
    id: raw.id,
    attendeeId: raw.attendee_id ?? raw.attendeeId,
    eventId: raw.event_id ?? raw.eventId ?? raw.workshop_id ?? raw.workshopId,
    motivation: raw.motivation,
    domain: raw.domain ?? null,
    track: raw.track ?? null,
    slot: raw.slot ?? null,
    roleBucket: raw.role_bucket ?? raw.roleBucket ?? null,
    ambassador: raw.ambassador ?? null,
    status: raw.status,
    checkedIn: raw.checked_in ?? raw.checkedIn ?? false,
    registeredAt: raw.registered_at ?? raw.registeredAt,
  };
}

export function prepareRegistrationPayload(formData) {
  const payload = {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    university_org: formData.universityOrg,
    github: formData.github || undefined,
    linkedin: formData.linkedin,
    cnic: formData.cnic,
    gender: formData.gender,
    best_describes_you: formData.bestDescribesYou,
    event_id: formData.eventId,
  };
  if (formData.motivation) payload.motivation = formData.motivation;
  if (formData.domain) payload.domain = formData.domain;
  if (formData.track) payload.track = formData.track;
  if (formData.slot) payload.slot = formData.slot;
  if (formData.ambassador?.trim()) payload.ambassador = formData.ambassador.trim();
  return payload;
}
