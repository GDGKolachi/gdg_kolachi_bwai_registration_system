import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEventById } from '../../events/event-repository';
import { isRegistrationOpen } from '../../events/event-service';
import { useRegister } from '../registration-repository';
import api from '../../../axios-instance';
import { validateRegistrationForm, hasErrors } from '../registration-service';
import { REGISTRATION_MODE } from '../registration-constants';
import AttendeeFormFields from '../components/attendee-form-fields';
import MotivationField from '../components/motivation-field';
import DomainSelect from '../components/domain-select';
import ExperienceFields from '../components/experience-fields';
import { TrackSelect, SlotSelect } from '../components/track-slot-select';
import TeamRegistrationForm from './team-registration-form';

export default function RegistrationForm() {
  const params = useParams();
  const eventId = params.eventId || params.workshopId;
  const navigate = useNavigate();
  const { data: event, isLoading: eventLoading } = useEventById(eventId);
  const registerMutation = useRegister();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    universityOrg: '',
    github: '',
    linkedin: '',
    cnic: '',
    gender: '',
    bestDescribesYou: '',
    motivation: '',
    domain: '',
    track: '',
    slot: '',
    yearsExperience: '',
    priorHackathons: '',
    skills: [],
    primarySkill: '',
    aiExperience: '',
    portfolioUrl: '',
    bestProject: '',
  });
  const [errors, setErrors] = useState({});
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [mode, setMode] = useState(null);

  const eventTypeSlug = event?.eventTypeSlug || event?.event_type?.slug;

  const handleEmailBlur = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const result = await api.get(`/registrations/check-email?email=${encodeURIComponent(formData.email)}`);
      // Block only if the attendee already has a registration in the SAME event type
      const sameType = (result.data.events || []).some(e => e.event_type_slug === eventTypeSlug);
      setAlreadyRegistered(sameType);
    } catch {
      // Allow form submission even if check fails
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const validationErrors = validateRegistrationForm(formData, eventTypeSlug, event);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    try {
      await registerMutation.mutateAsync({ ...formData, eventId });
      toast.success('Registration submitted!');
      navigate('/registration/confirmation', {
        state: { eventTitle: event?.title, email: formData.email },
      });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Registration failed';
      if (status === 413 || msg.includes('entity too large')) {
        toast.error('Your response is too long. Please shorten your answers and try again.');
      } else if (msg.includes('already registered')) {
        setAlreadyRegistered(true);
        toast.error(msg);
      } else {
        toast.error(msg);
      }
    }
  };

  if (eventLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
            aria-hidden
          />
          Loading…
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="ui-card border-rose-200/80 bg-rose-50/50 px-5 py-4 text-sm font-medium text-rose-800">
        Event not found.
      </div>
    );
  }

  const canRegister = isRegistrationOpen(event);
  const allowsTeams =
    eventTypeSlug === 'hackathon' && event.teamConfig?.allowSelfRegisteredTeams === true;
  const needsModeChoice = allowsTeams && mode === null;

  if (allowsTeams && canRegister && mode === REGISTRATION_MODE.TEAM) {
    return <TeamRegistrationForm event={event} eventId={eventId} onBack={() => setMode(null)} />;
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to={`/events/${eventId}`} className="ui-link-back">
        ← Back to {event.title}
      </Link>

      <div className="ui-card p-6 sm:p-8">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Register</h1>
          {event.eventTypeName && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{event.eventTypeName}</p>
          )}
          <p className="mt-2 text-sm font-medium text-slate-600">{event.title}</p>
        </div>

        {!canRegister && (
          <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 ring-1 ring-amber-200/70">
            Registration is not currently open for this event.
          </div>
        )}

        {alreadyRegistered && event.allowExceptions !== false && (
          <div className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 ring-1 ring-rose-200/70">
            This email is already registered for a {event.eventTypeName || 'event'} of this type.{' '}
            <Link
              to={`/exception-request/${eventId}`}
              className="font-semibold text-gdg-blue underline decoration-gdg-blue/30 underline-offset-2 hover:decoration-gdg-blue"
            >
              Submit an exception request →
            </Link>
          </div>
        )}

        {canRegister && needsModeChoice && (!alreadyRegistered || event.allowExceptions === false) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode(REGISTRATION_MODE.INDIVIDUAL)}
              className="ui-card-quiet p-5 text-left transition hover:border-gdg-blue hover:bg-white"
            >
              <span className="block text-base font-semibold text-slate-900">Register as an individual</span>
              <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">
                Sign up on your own. We will help you find a team at the event.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode(REGISTRATION_MODE.TEAM)}
              className="ui-card-quiet p-5 text-left transition hover:border-gdg-blue hover:bg-white"
            >
              <span className="block text-base font-semibold text-slate-900">Register a team</span>
              <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">
                You are the captain — fill in every member&apos;s details and submit once.
              </span>
            </button>
          </div>
        )}

        {canRegister && !needsModeChoice && (!alreadyRegistered || event.allowExceptions === false) && (
          <form onSubmit={handleSubmit}>
            {allowsTeams && (
              <button type="button" onClick={() => setMode(null)} className="ui-link-back">
                ← Choose a different registration option
              </button>
            )}
            <AttendeeFormFields
              formData={formData}
              onChange={setFormData}
              errors={errors}
              eventTypeSlug={eventTypeSlug}
            />
            <div onBlur={handleEmailBlur} />

            {eventTypeSlug === 'hackathon' && (
              <>
                <DomainSelect
                  value={formData.domain}
                  onChange={val => setFormData(prev => ({ ...prev, domain: val }))}
                  error={errors.domain}
                />
                <ExperienceFields
                  formData={formData}
                  onChange={setFormData}
                  errors={errors}
                  variant="full"
                />
              </>
            )}

            {eventTypeSlug === 'community-lounge' && (
              <>
                <TrackSelect
                  tracks={event.tracks || []}
                  value={formData.track}
                  onChange={val => setFormData(prev => ({ ...prev, track: val }))}
                  error={errors.track}
                />
                <SlotSelect
                  slots={event.slots || []}
                  value={formData.slot}
                  onChange={val => setFormData(prev => ({ ...prev, slot: val }))}
                  error={errors.slot}
                />
              </>
            )}

            <MotivationField
              value={formData.motivation}
              onChange={val => setFormData(prev => ({ ...prev, motivation: val }))}
              error={errors.motivation}
              eventTypeSlug={eventTypeSlug}
            />
            <button
              type="submit"
              className="ui-btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Submitting…' : 'Submit registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
