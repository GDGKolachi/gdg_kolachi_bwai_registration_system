import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminRegistrationApi } from './admin-registration-api';

export function useAdminRegistrations(eventId, params = {}) {
  return useQuery({
    queryKey: ['admin-registrations', eventId, params],
    queryFn: () => adminRegistrationApi.getByEvent(eventId, params),
    enabled: !!eventId,
  });
}

export function useEventAmbassadors(eventId) {
  return useQuery({
    queryKey: ['admin-ambassadors', eventId],
    queryFn: () => adminRegistrationApi.getAmbassadors(eventId),
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

export function useSendReminder() {
  return useMutation({
    mutationFn: ({ ids, message }) => adminRegistrationApi.sendReminder(ids, message),
  });
}

export function useSendRejection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, alsoReject }) => adminRegistrationApi.sendRejection(ids, alsoReject),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-registrations'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useDeleteRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminRegistrationApi.softDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-registrations'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useRestoreRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminRegistrationApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-registrations'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useImportCsvStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ csv, status }) => adminRegistrationApi.importCsvStatus(csv, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-registrations'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
