import { useQuery } from '@tanstack/react-query';
import { workshopApi } from './workshop-api';
import { adaptWorkshop, adaptWorkshopList } from './workshop-adapter';

export function useWorkshops() {
  return useQuery({
    queryKey: ['workshops'],
    queryFn: async () => {
      const data = await workshopApi.getAll();
      return adaptWorkshopList(data);
    },
    staleTime: 30_000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

export function useWorkshopById(id) {
  return useQuery({
    queryKey: ['workshops', id],
    queryFn: async () => {
      const data = await workshopApi.getById(id);
      return adaptWorkshop(data);
    },
    enabled: !!id,
  });
}
