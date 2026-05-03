import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, type CampaignInput } from '@/lib/mockApi';
import { useAuthStore } from '@/stores/authStore';
import type { Campaign, CampaignId, CampaignRole, UserId } from '@/types';

const CAMPAIGNS_KEY = ['campaigns'] as const;

function useCurrentUserId(): UserId {
  const id = useAuthStore((s) => s.user?.id);
  if (!id) throw new Error('Usuário não autenticado');
  return id;
}

export function useCampaignsQuery() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, userId],
    queryFn: () => campaignsApi.list(userId as UserId),
    enabled: Boolean(userId),
  });
}

export function useCampaignQuery(campaignId: CampaignId | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, 'detail', campaignId, userId],
    queryFn: () => campaignsApi.get(userId as UserId, campaignId as CampaignId),
    enabled: Boolean(userId && campaignId),
  });
}

export function useCreateCampaignMutation() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: CampaignInput): Promise<Campaign> => campaignsApi.create(userId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useUpdateCampaignMutation() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: ({ id, patch }: { id: CampaignId; patch: Partial<CampaignInput> }) =>
      campaignsApi.update(userId, id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useDeleteCampaignMutation() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (id: CampaignId) => campaignsApi.delete(userId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useAddMemberMutation() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: ({
      campaignId,
      userId: memberId,
      role,
    }: {
      campaignId: CampaignId;
      userId: UserId;
      role: CampaignRole;
    }) => campaignsApi.addMember(userId, campaignId, memberId, role),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
      qc.invalidateQueries({ queryKey: [...CAMPAIGNS_KEY, 'detail', vars.campaignId] });
    },
  });
}

export function useRemoveMemberMutation() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: ({ campaignId, userId: memberId }: { campaignId: CampaignId; userId: UserId }) =>
      campaignsApi.removeMember(userId, campaignId, memberId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
      qc.invalidateQueries({ queryKey: [...CAMPAIGNS_KEY, 'detail', vars.campaignId] });
    },
  });
}

export function useChangeMemberRoleMutation() {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: ({
      campaignId,
      userId: memberId,
      role,
    }: {
      campaignId: CampaignId;
      userId: UserId;
      role: CampaignRole;
    }) => campaignsApi.changeMemberRole(userId, campaignId, memberId, role),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
      qc.invalidateQueries({ queryKey: [...CAMPAIGNS_KEY, 'detail', vars.campaignId] });
    },
  });
}
