import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { charactersApi, type CharacterInput } from '@/lib/mockApi';
import { useAuthStore } from '@/stores/authStore';
import type { CampaignId, Character, CharacterId, UserId } from '@/types';

const CHARACTERS_KEY = ['characters'] as const;

function useUserId(): UserId {
  const id = useAuthStore((s) => s.user?.id);
  if (!id) throw new Error('Não autenticado');
  return id;
}

export function useCharactersQuery(campaignId: CampaignId | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...CHARACTERS_KEY, campaignId, userId],
    queryFn: () => charactersApi.list(userId as UserId, campaignId as CampaignId),
    enabled: Boolean(userId && campaignId),
  });
}

export function useCharacterQuery(characterId: CharacterId | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...CHARACTERS_KEY, 'detail', characterId, userId],
    queryFn: () => charactersApi.get(userId as UserId, characterId as CharacterId),
    enabled: Boolean(userId && characterId),
  });
}

export function useCreateCharacterMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: CharacterInput): Promise<Character> =>
      charactersApi.create(userId, campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...CHARACTERS_KEY, campaignId] });
    },
  });
}

export function useUpdateCharacterMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: CharacterId;
      patch: Partial<Omit<CharacterInput, 'ownerId'>>;
    }) => charactersApi.update(userId, id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...CHARACTERS_KEY, campaignId] });
      qc.invalidateQueries({ queryKey: [...CHARACTERS_KEY, 'detail', data.id] });
    },
  });
}

export function useDeleteCharacterMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (id: CharacterId) => charactersApi.delete(userId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...CHARACTERS_KEY, campaignId] });
    },
  });
}
