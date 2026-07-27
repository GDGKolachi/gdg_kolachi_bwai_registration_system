import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useRegisterTeam } from '../team-registration-repository';
import { validateTeamRegistration, hasTeamErrors } from '../team-registration-service';
import TeamDetailsFields from '../components/team-details-fields';
import MemberCard from '../components/member-card';

let memberSeq = 0;

function emptyMember() {
  memberSeq += 1;
  return {
    key: `member-${memberSeq}`,
    name: '',
    email: '',
    phone: '',
    universityOrg: '',
    github: '',
    linkedin: '',
    cnic: '',
    gender: '',
    bestDescribesYou: '',
    skills: [],
    primarySkill: '',
  };
}

function emptyCaptain() {
  return {
    ...emptyMember(),
    yearsExperience: '',
    priorHackathons: '',
    aiExperience: '',
    portfolioUrl: '',
    bestProject: '',
    motivation: '',
    ambassador: '',
  };
}

export default function TeamRegistrationForm({ event, eventId, onBack }) {
  const navigate = useNavigate();
  const registerTeam = useRegisterTeam();

  const config = event?.teamConfig || {};
  const minTeamSize = config.minTeamSize || 2;
  const maxTeamSize = Math.max(config.maxTeamSize || 4, minTeamSize);

  const [team, setTeam] = useState({
    name: '',
    domain: '',
    hasIdea: null,
    ideaDescription: '',
    workedTogether: '',
  });
  const [members, setMembers] = useState(() => {
    const initial = [emptyCaptain()];
    for (let i = 1; i < minTeamSize; i += 1) initial.push(emptyMember());
    return initial;
  });
  const [expandedKeys, setExpandedKeys] = useState(() => [members[0].key]);
  const [errors, setErrors] = useState({ team: {}, members: [] });

  const teamSectionRef = useRef(null);
  const memberRefs = useRef({});

  const canRemove = members.length > minTeamSize;

  const toggleExpanded = (key) => {
    setExpandedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const updateMember = (index, next) => {
    setMembers((prev) => prev.map((member, i) => (i === index ? next : member)));
  };

  const addMember = () => {
    if (members.length >= maxTeamSize) return;
    const member = emptyMember();
    setMembers((prev) => [...prev, member]);
    setExpandedKeys((prev) => [...prev, member.key]);
  };

  const removeMember = (index) => {
    const removed = members[index];
    setMembers((prev) => prev.filter((_, i) => i !== index));
    setExpandedKeys((prev) => prev.filter((k) => k !== removed.key));
    setErrors((prev) => ({ ...prev, members: (prev.members || []).filter((_, i) => i !== index) }));
    delete memberRefs.current[removed.key];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const state = { eventId, team, members };
    const validation = validateTeamRegistration(state, event);
    setErrors(validation);

    if (hasTeamErrors(validation)) {
      const brokenKeys = members
        .filter((_, i) => Object.keys(validation.members[i] || {}).length > 0)
        .map((member) => member.key);
      if (brokenKeys.length) {
        setExpandedKeys((prev) => Array.from(new Set([...prev, ...brokenKeys])));
      }
      toast.error('Please fix the highlighted fields before submitting.');
      const teamBroken = Object.keys(validation.team || {}).length > 0;
      setTimeout(() => {
        const target = teamBroken ? teamSectionRef.current : memberRefs.current[brokenKeys[0]];
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return;
    }

    try {
      await registerTeam.mutateAsync(state);
      toast.success('Team registration submitted!');
      navigate('/registration/confirmation', {
        state: {
          eventTitle: event?.title,
          email: members[0].email,
          teamName: team.name,
          memberCount: members.length,
        },
      });
    } catch (err) {
      const status = err.response?.status;
      const raw = err.response?.data?.message;
      const msg = (Array.isArray(raw) ? raw.join(', ') : raw) || 'Team registration failed';
      if (status === 413 || msg.includes('entity too large')) {
        toast.error('Your responses are too long. Please shorten your answers and try again.');
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/events/${eventId}`} className="ui-link-back">
        ← Back to {event?.title}
      </Link>

      <div className="ui-card p-5 sm:p-8">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Register a team</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">{event?.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            As the team captain you fill in every member&apos;s details here and submit once. Teams can have{' '}
            {minTeamSize}–{maxTeamSize} members.
          </p>
          {onBack && (
            <button type="button" onClick={onBack} className="ui-link-back mt-4">
              ← Register as an individual instead
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div ref={teamSectionRef} className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Team details</h2>
            <TeamDetailsFields team={team} onChange={setTeam} errors={errors.team} />
          </div>

          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Members ({members.length}/{maxTeamSize})
              </h2>
            </div>

            {members.map((member, index) => (
              <div
                key={member.key}
                ref={(el) => {
                  memberRefs.current[member.key] = el;
                }}
              >
                <MemberCard
                  index={index}
                  member={member}
                  onChange={(next) => updateMember(index, next)}
                  errors={errors.members?.[index]}
                  expanded={expandedKeys.includes(member.key)}
                  onToggle={() => toggleExpanded(member.key)}
                  onRemove={() => removeMember(index)}
                  canRemove={canRemove}
                />
              </div>
            ))}

            {errors.team?.members && (
              <div className="mt-1 text-xs font-medium text-gdg-red">{errors.team.members}</div>
            )}

            <button
              type="button"
              onClick={addMember}
              disabled={members.length >= maxTeamSize}
              className="ui-btn-secondary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-55"
            >
              {members.length >= maxTeamSize ? `Maximum ${maxTeamSize} members reached` : '+ Add member'}
            </button>
          </div>

          <button
            type="submit"
            className="ui-btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={registerTeam.isPending}
          >
            {registerTeam.isPending ? 'Submitting…' : 'Submit team registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
