import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creditsPublicApi } from './credits-public-api';

export function useCreditsConfirm(token) {
  return useQuery({
    queryKey: ['credits-confirm', token],
    queryFn: () => creditsPublicApi.get(token),
    enabled: !!token,
    // A 404 means a bad link: retrying will not change that.
    retry: (count, err) => err?.response?.status !== 404 && count < 2,
    refetchOnWindowFocus: false,
  });
}

export function useRedeemCredits(token) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => creditsPublicApi.redeem(token),
    onSuccess: (data) => {
      qc.setQueryData(['credits-confirm', token], (prev) =>
        prev ? { ...prev, redeemed: true, redeemed_at: data.redeemed_at } : prev,
      );
    },
  });
}

export function useSelfResend() {
  return useMutation({ mutationFn: creditsPublicApi.resend });
}
