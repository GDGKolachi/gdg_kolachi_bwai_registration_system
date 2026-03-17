import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from './checkin-api';

export function useToggleCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: checkinApi.toggleCheckin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
