import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminRegistrationApi } from './admin-registration-api';

export function useAdminRegistrations(workshopId, params = {}) {
  return useQuery({
    queryKey: ['admin-registrations', workshopId, params],
    queryFn: () => adminRegistrationApi.getByWorkshop(workshopId, params),
    enabled: !!workshopId,
  });
}

export function useUpdateRegistrationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => adminRegistrationApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-registrations'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useBulkUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }) => adminRegistrationApi.bulkUpdateStatus(ids, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-registrations'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
