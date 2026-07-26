import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teamRegistrationApi } from './team-registration-api';
import { prepareTeamRegistrationPayload } from './team-registration-adapter';

export function useRegisterTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (state) => {
      const payload = prepareTeamRegistrationPayload(state);
      return teamRegistrationApi.register(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
