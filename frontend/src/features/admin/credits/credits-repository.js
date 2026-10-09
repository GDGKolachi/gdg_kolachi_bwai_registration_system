import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creditsApi } from './credits-api';

export const CREDITS_REFRESH_MS = 15_000;

// Anything that changes a credits row also changes the registrations grid
// column and the event summary, so refresh all three.
function invalidateCredits(qc) {
  qc.invalidateQueries({ queryKey: ['credits'] });
  qc.invalidateQueries({ queryKey: ['admin-registrations'] });
}

export function useRegistrationCredits(registrationId) {
  return useQuery({
    queryKey: ['credits', 'registration', registrationId],
    queryFn: () => creditsApi.getForRegistration(registrationId),
    enabled: !!registrationId,
  });
}

export function useSendCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (registrationId) => creditsApi.send(registrationId),
    onSuccess: () => invalidateCredits(qc),
  });
}

export function useConfirmCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (registrationId) => creditsApi.confirm(registrationId),
    onSuccess: () => invalidateCredits(qc),
  });
}

export function useUnconfirmCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (registrationId) => creditsApi.unconfirm(registrationId),
    onSuccess: () => invalidateCredits(qc),
  });
}

/** Creating the QR also creates the (unsent) credits row, so never serve it from cache. */
export function useCreditsQr(registrationId) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['credits', 'qr', registrationId],
    queryFn: async () => {
      const data = await creditsApi.getQr(registrationId);
      qc.invalidateQueries({ queryKey: ['credits', 'registration', registrationId] });
      return data;
    },
    enabled: !!registrationId,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCreditsSummary(eventId) {
  return useQuery({
    queryKey: ['credits', 'summary', eventId],
    queryFn: () => creditsApi.summary(eventId),
    enabled: !!eventId,
    refetchInterval: CREDITS_REFRESH_MS,
  });
}

export function useCreditsFollowUp(eventId, filter) {
  return useQuery({
    queryKey: ['credits', 'follow-up', eventId, filter],
    queryFn: () => creditsApi.followUp(eventId, filter),
    enabled: !!eventId,
    refetchInterval: CREDITS_REFRESH_MS,
  });
}

export function useSendBulkCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId) => creditsApi.sendBulk(eventId),
    onSuccess: () => invalidateCredits(qc),
  });
}

export function useResendQr(eventId) {
  return useQuery({
    queryKey: ['credits', 'resend-qr', eventId],
    queryFn: () => creditsApi.resendQr(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
