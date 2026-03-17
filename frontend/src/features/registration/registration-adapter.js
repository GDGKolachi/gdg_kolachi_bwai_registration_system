export function adaptRegistration(raw) {
  return {
    id: raw.id,
    attendeeId: raw.attendee_id ?? raw.attendeeId,
    workshopId: raw.workshop_id ?? raw.workshopId,
    motivation: raw.motivation,
    status: raw.status,
    checkedIn: raw.checked_in ?? raw.checkedIn ?? false,
    registeredAt: raw.registered_at ?? raw.registeredAt,
  };
}

export function prepareRegistrationPayload(formData) {
  return {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    university_org: formData.universityOrg,
    github_linkedin: formData.githubLinkedin,
    cnic: formData.cnic,
    workshop_id: formData.workshopId,
    motivation: formData.motivation,
  };
}
