import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminExceptionApi } from './admin-exception-api';

export function useAdminExceptions() {
  return useQuery({
    queryKey: ['admin-exceptions'],
    queryFn: adminExceptionApi.getAll,
  });
}

export function useApproveException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminExceptionApi.approve,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-exceptions'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useRejectException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminExceptionApi.reject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-exceptions'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
