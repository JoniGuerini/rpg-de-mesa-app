import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notesApi, type NoteInput } from '@/lib/mockApi';
import { useAuthStore } from '@/stores/authStore';
import type { CampaignId, NoteId, UserId } from '@/types';

const NOTES_KEY = ['notes'] as const;

function useUserId(): UserId {
  const id = useAuthStore((s) => s.user?.id);
  if (!id) throw new Error('Não autenticado');
  return id;
}

export function useNotesQuery(
  campaignId: CampaignId | undefined,
  filters?: { search?: string; tag?: string },
) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...NOTES_KEY, campaignId, userId, filters?.search ?? '', filters?.tag ?? ''],
    queryFn: () => notesApi.list(userId as UserId, campaignId as CampaignId, filters),
    enabled: Boolean(userId && campaignId),
  });
}

export function useCreateNoteMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: NoteInput) => notesApi.create(userId, campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTES_KEY, campaignId] });
    },
  });
}

export function useUpdateNoteMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({ id, patch }: { id: NoteId; patch: Partial<NoteInput> }) =>
      notesApi.update(userId, id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTES_KEY, campaignId] });
    },
  });
}

export function useDeleteNoteMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (id: NoteId) => notesApi.delete(userId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTES_KEY, campaignId] });
    },
  });
}
