import { useQuery } from '@tanstack/react-query';
import { adminRegistrationApi } from './admin-registration-api';

export function useAdminRegistrations(workshopId) {
  return useQuery({
    queryKey: ['admin-registrations', workshopId],
    queryFn: () => adminRegistrationApi.getByWorkshop(workshopId),
    enabled: !!workshopId,
  });
}
