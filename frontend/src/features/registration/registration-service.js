import {
  DEFAULT_ROLE_OPTIONS,
  HACKATHON_DOMAIN_OPTIONS,
  HACKATHON_ROLE_OPTIONS,
} from './registration-constants';

const PHONE_REGEX = /^(03\d{9}|\+923\d{9})$/;
const CNIC_REGEX = /^\d{13}$/;

export function validateRegistrationForm(data, eventTypeSlug, event) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Full name is required';
  if (!data.email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email format';
  if (!data.phone?.trim()) errors.phone = 'Phone number is required';
  else {
    const digits = data.phone.replace(/[\s\-()]/g, '');
    if (!PHONE_REGEX.test(digits)) errors.phone = 'Enter a valid Pakistani phone number (e.g. 03XX-XXXXXXX)';
  }
  if (!data.universityOrg?.trim()) errors.universityOrg = 'Organization is required';
  if (!data.linkedin?.trim()) errors.linkedin = 'LinkedIn profile is required';
  if (!data.cnic?.trim()) errors.cnic = 'CNIC/National ID is required';
  else {
    const cnicDigits = data.cnic.replace(/[\s\-]/g, '');
    if (!CNIC_REGEX.test(cnicDigits)) errors.cnic = 'CNIC must be exactly 13 digits (e.g. XXXXX-XXXXXXX-X)';
  }
  if (!data.gender) errors.gender = 'Gender is required';

  if (!data.bestDescribesYou) {
    errors.bestDescribesYou = 'This field is required';
  } else {
    const allowed = eventTypeSlug === 'hackathon' ? HACKATHON_ROLE_OPTIONS : DEFAULT_ROLE_OPTIONS;
    if (!allowed.includes(data.bestDescribesYou)) {
      errors.bestDescribesYou = 'Please choose a valid option';
    }
  }

  if (eventTypeSlug === 'hackathon') {
    if (!data.domain) errors.domain = 'Please select a domain';
    else if (!HACKATHON_DOMAIN_OPTIONS.includes(data.domain)) errors.domain = 'Please select a valid domain';
    if (!data.motivation?.trim()) errors.motivation = 'Please describe how you will contribute';
    else if (data.motivation.trim().length > 2000) errors.motivation = 'Please keep your response under 2000 characters';
  } else if (eventTypeSlug === 'community-lounge') {
    if (!data.track) errors.track = 'Please select a track';
    else if (event?.tracks && !event.tracks.includes(data.track)) errors.track = 'Please select a valid track';
    if (!data.slot) errors.slot = 'Please select a slot';
    else if (event?.slots && !event.slots.includes(data.slot)) errors.slot = 'Please select a valid slot';
  } else {
    if (!data.motivation?.trim()) errors.motivation = 'Motivation is required';
    else if (data.motivation.trim().length > 2000) errors.motivation = 'Please keep your response under 2000 characters';
  }

  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
