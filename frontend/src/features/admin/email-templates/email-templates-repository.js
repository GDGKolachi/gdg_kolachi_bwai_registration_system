import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailTemplatesApi } from './email-templates-api';

const KEY = ['admin-email-templates'];

export function useEmailTemplates() {
  return useQuery({ queryKey: KEY, queryFn: emailTemplatesApi.list });
}

function useInvalidating(mutationFn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) });
}

export const useSetEmailTheme = () => useInvalidating(emailTemplatesApi.setTheme);
export const useSaveEmailTemplate = () => useInvalidating(({ type, copy }) => emailTemplatesApi.save(type, copy));
export const useResetEmailTemplate = () => useInvalidating((type) => emailTemplatesApi.reset(type));
export const useSendTestEmail = () => useMutation({ mutationFn: ({ type, body }) => emailTemplatesApi.test(type, body) });

/** Server-rendered preview of the unsaved form. Keyed on the inputs, so React Query dedupes and caches. */
export function useEmailPreview(type, body, enabled = true) {
  return useQuery({
    queryKey: ['admin-email-preview', type, body],
    queryFn: () => emailTemplatesApi.preview(type, body),
    enabled: !!type && enabled,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}
