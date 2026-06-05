import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminEventApi } from './admin-event-api';

export function useAdminEvents() {
  return useQuery({
    queryKey: ['admin-events'],
    queryFn: adminEventApi.getAll,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminEventApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => adminEventApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminEventApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
  });
}

export function useLockAcknowledgements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminEventApi.lockAcknowledgements(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      qc.invalidateQueries({ queryKey: ['admin-registrations'] });
    },
  });
}

export function useUnlockAcknowledgements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminEventApi.unlockAcknowledgements(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
  });
}
