import { useMutation } from '@tanstack/react-query';
import { exceptionApi } from './exception-api';

export function useSubmitException() {
  return useMutation({
    mutationFn: (data) => exceptionApi.submit(data),
  });
}
