import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminRegistrationApi } from './admin-registration-api';

export function useAdminRegistrations(workshopId, params = {}) {
  return useQuery({
    queryKey: ['admin-registrations', workshopId, params],
    queryFn: () => adminRegistrationApi.getByWorkshop(workshopId, params),
    enabled: !!workshopId,
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

// Alias kept so existing import { useBulkUpdateStatus } in the viewer still works
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
