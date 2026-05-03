import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, type ItemInput } from '@/lib/mockApi';
import { useAuthStore } from '@/stores/authStore';
import type { CampaignId, CharacterId, ID, ItemId, UserId } from '@/types';

const INVENTORY_KEY = ['inventory'] as const;

function useUserId(): UserId {
  const id = useAuthStore((s) => s.user?.id);
  if (!id) throw new Error('Não autenticado');
  return id;
}

export function useInventoryQuery(campaignId: CampaignId | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...INVENTORY_KEY, campaignId, userId],
    queryFn: () => inventoryApi.list(userId as UserId, campaignId as CampaignId),
    enabled: Boolean(userId && campaignId),
  });
}

export function useCreateItemMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: ItemInput) => inventoryApi.createItem(userId, campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...INVENTORY_KEY, campaignId] });
    },
  });
}

export function useAddInventoryMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (args: {
      characterId: CharacterId;
      itemId: ItemId;
      quantity: number;
      note?: string;
    }) => inventoryApi.addToCharacter(userId, { ...args, campaignId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...INVENTORY_KEY, campaignId] });
    },
  });
}

export function useRemoveInventoryMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (args: { entryId: ID; quantity: number; note?: string }) =>
      inventoryApi.removeFromCharacter(userId, args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...INVENTORY_KEY, campaignId] });
    },
  });
}

export function useToggleEquippedMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (entryId: ID) => inventoryApi.toggleEquipped(userId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...INVENTORY_KEY, campaignId] });
    },
  });
}
