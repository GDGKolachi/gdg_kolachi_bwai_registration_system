import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminWorkshopApi } from './admin-workshop-api';

export function useAdminWorkshops() {
  return useQuery({
    queryKey: ['admin-workshops'],
    queryFn: adminWorkshopApi.getAll,
  });
}

export function useCreateWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminWorkshopApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-workshops'] }),
  });
}

export function useUpdateWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => adminWorkshopApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-workshops'] }),
  });
}

export function useDeleteWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminWorkshopApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-workshops'] }),
  });
}
