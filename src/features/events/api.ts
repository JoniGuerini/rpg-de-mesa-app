import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi, type EventInput } from '@/lib/mockApi';
import { useAuthStore } from '@/stores/authStore';
import type { CampaignId, EventId, SessionId, UserId } from '@/types';

const EVENTS_KEY = ['events'] as const;

function useUserId(): UserId {
  const id = useAuthStore((s) => s.user?.id);
  if (!id) throw new Error('Não autenticado');
  return id;
}

export function useEventsQuery(campaignId: CampaignId | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...EVENTS_KEY, 'campaign', campaignId, userId],
    queryFn: () => eventsApi.listByCampaign(userId as UserId, campaignId as CampaignId),
    enabled: Boolean(userId && campaignId),
  });
}

export function useSessionEventsQuery(sessionId: SessionId | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...EVENTS_KEY, 'session', sessionId, userId],
    queryFn: () => eventsApi.listBySession(userId as UserId, sessionId as SessionId),
    enabled: Boolean(userId && sessionId),
  });
}

export function useCreateEventMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: EventInput) => eventsApi.create(userId, campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EVENTS_KEY, 'campaign', campaignId] });
      qc.invalidateQueries({ queryKey: [...EVENTS_KEY, 'session'] });
    },
  });
}

export function useUpdateEventMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({ id, patch }: { id: EventId; patch: Partial<EventInput> }) =>
      eventsApi.update(userId, id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EVENTS_KEY, 'campaign', campaignId] });
      qc.invalidateQueries({ queryKey: [...EVENTS_KEY, 'session'] });
    },
  });
}

export function useDeleteEventMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (id: EventId) => eventsApi.delete(userId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...EVENTS_KEY, 'campaign', campaignId] });
      qc.invalidateQueries({ queryKey: [...EVENTS_KEY, 'session'] });
    },
  });
}
