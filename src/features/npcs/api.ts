import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { npcsApi, type NpcInput } from '@/lib/mockApi';
import { useAuthStore } from '@/stores/authStore';
import type { CampaignId, NPC, NpcId, UserId } from '@/types';

const NPC_KEY = ['npcs'] as const;

function useUserId(): UserId {
  const id = useAuthStore((s) => s.user?.id);
  if (!id) throw new Error('Não autenticado');
  return id;
}

export function useNpcsQuery(campaignId: CampaignId | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...NPC_KEY, campaignId, userId],
    queryFn: () => npcsApi.list(userId as UserId, campaignId as CampaignId),
    enabled: Boolean(userId && campaignId),
  });
}

export function useCreateNpcMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: NpcInput): Promise<NPC> => npcsApi.create(userId, campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NPC_KEY, campaignId] });
    },
  });
}

export function useUpdateNpcMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({ id, patch }: { id: NpcId; patch: Partial<NpcInput> }) =>
      npcsApi.update(userId, id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NPC_KEY, campaignId] });
    },
  });
}

export function useDeleteNpcMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (id: NpcId) => npcsApi.delete(userId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NPC_KEY, campaignId] });
    },
  });
}

export function useRevealNpcMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({ id, targetUserId }: { id: NpcId; targetUserId: UserId }) =>
      npcsApi.revealTo(userId, id, targetUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NPC_KEY, campaignId] });
    },
  });
}

export function useHideNpcMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({ id, targetUserId }: { id: NpcId; targetUserId: UserId }) =>
      npcsApi.hideFrom(userId, id, targetUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NPC_KEY, campaignId] });
    },
  });
}
