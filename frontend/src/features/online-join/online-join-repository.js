import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onlineJoinApi } from './online-join-api';

export function useOnlineJoin(token) {
  return useQuery({
    queryKey: ['online-join', token],
    queryFn: () => onlineJoinApi.get(token),
    enabled: !!token,
    retry: (count, err) => err?.response?.status !== 404 && count < 2,
    // Before the window opens the page waits; a refresh every 30 s flips the
    // button on without the attendee reloading.
    refetchInterval: (query) => (query.state.data?.checkin?.state === 'not_open' ? 30_000 : false),
    refetchOnWindowFocus: false,
  });
}

export function useSelfCheckin(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => onlineJoinApi.checkin(token),
    onSuccess: (data) => qc.setQueryData(['online-join', token], data),
  });
}
