import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminRegistrationApi } from './admin-registration-api';

export function useAdminRegistrations(eventId, params = {}) {
  return useQuery({
    queryKey: ['admin-registrations', eventId, params],
    queryFn: () => adminRegistrationApi.getByEvent(eventId, params),
    enabled: !!eventId,
  });
}

// Unified hook — works for a single ID or an array of IDs
export function useUpdateRegistrationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ids, status }) =>
      adminRegistrationApi.updateStatus(ids ?? id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-registrations'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useBulkUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }) => adminRegistrationApi.updateStatus(ids, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-registrations'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
