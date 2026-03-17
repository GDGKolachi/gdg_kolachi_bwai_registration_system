import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { registrationApi } from './registration-api';
import { prepareRegistrationPayload } from './registration-adapter';

export function useCheckEmail(email) {
  return useQuery({
    queryKey: ['check-email', email],
    queryFn: () => registrationApi.checkEmail(email),
    enabled: !!email && email.includes('@'),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => {
      const payload = prepareRegistrationPayload(formData);
      return registrationApi.register(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
    },
  });
}
