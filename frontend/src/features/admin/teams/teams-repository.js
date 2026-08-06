import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from './teams-api';

export function useTeams(eventId) {
  return useQuery({
    queryKey: ['teams', eventId],
    queryFn: () => teamsApi.list(eventId),
    enabled: !!eventId,
  });
}

/**
 * A single team with its whole roster. Used by the registration drawer, which
 * only knows the team id attached to the row it opened.
 */
export function useTeam(teamId) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamsApi.getOne(teamId),
    enabled: !!teamId,
  });
}

/**
 * Emails each selected team once — captain addressed, teammates CC'd. Nothing
 * about the team changes, so no cache needs invalidating.
 */
export function useMessageTeams() {
  return useMutation({
    mutationFn: ({ teamIds, subject, message, includeEventDetails, includeRoster }) =>
      teamsApi.messageTeams(teamIds, { subject, message, includeEventDetails, includeRoster }),
  });
}

/** Emails the captains and starts each team's 24-hour deposit window. */
export function useRequestTeamPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamIds) => teamsApi.requestPayment(teamIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

export function useConfirmTeamPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamId) => teamsApi.confirmPayment(teamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

export function useRejectTeamPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, reason }) => teamsApi.rejectPayment(teamId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

export function useTeamFormationConfig(eventId) {
  return useQuery({
    queryKey: ['team-config', eventId],
    queryFn: () => teamsApi.getConfig(eventId),
    enabled: !!eventId,
  });
}

export function useUpdateTeamFormationConfig(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => teamsApi.updateConfig(eventId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-config', eventId] }),
  });
}

export function useOptimizeTeams(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => teamsApi.optimize(eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', eventId] }),
  });
}

export function useLockTeams(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => teamsApi.lock(eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', eventId] }),
  });
}

export function useUnlockTeam(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamId) => teamsApi.unlockTeam(teamId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', eventId] }),
  });
}

export function useUpdateTeamStatus(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, status }) => teamsApi.updateTeamStatus(teamId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', eventId] }),
  });
}

export function useMoveMember(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, registrationId }) => teamsApi.moveMember(teamId, registrationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', eventId] }),
  });
}

export function useSwapMembers(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ registrationIdA, registrationIdB }) => teamsApi.swapMembers(registrationIdA, registrationIdB),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['teams', eventId], refetchType: 'active' });
    },
  });
}

export function useHackathonCheckin(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (registrationId) => teamsApi.hackathonCheckin(registrationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', eventId] }),
  });
}

export function useHackathonUnassign(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (registrationId) => teamsApi.hackathonUnassign(registrationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', eventId] }),
  });
}
