import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from './checkin-api';

export function useSetCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: checkinApi.setCheckin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
