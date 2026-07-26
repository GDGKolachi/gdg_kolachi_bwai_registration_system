import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from './teams-api';

export function useTeams(eventId) {
  return useQuery({
    queryKey: ['teams', eventId],
    queryFn: () => teamsApi.list(eventId),
    enabled: !!eventId,
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
