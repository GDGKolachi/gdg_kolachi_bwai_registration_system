import { useQuery } from '@tanstack/react-query';
import { eventApi } from './event-api';
import { adaptEvent, adaptEventList } from './event-adapter';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const data = await eventApi.getAll();
      return adaptEventList(data);
    },
    staleTime: 30_000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

export function useEventById(id) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const data = await eventApi.getById(id);
      return adaptEvent(data);
    },
    enabled: !!id,
  });
}

// Backwards-compat aliases
export const useWorkshops = useEvents;
export const useWorkshopById = useEventById;
