import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventTypesApi } from './event-types-api';

export function useActiveEventTypes() {
  return useQuery({
    queryKey: ['event-types', 'active'],
    queryFn: eventTypesApi.list,
    staleTime: 60_000,
  });
}

export function useAdminEventTypes() {
  return useQuery({
    queryKey: ['admin-event-types'],
    queryFn: eventTypesApi.adminList,
  });
}

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: ['admin-event-types'] });
  qc.invalidateQueries({ queryKey: ['event-types', 'active'] });
}

export function useCreateEventType() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: eventTypesApi.create, onSuccess: () => invalidate(qc) });
}

export function useUpdateEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => eventTypesApi.update(id, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteEventType() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: eventTypesApi.delete, onSuccess: () => invalidate(qc) });
}
