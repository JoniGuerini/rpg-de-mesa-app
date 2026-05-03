import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionsApi, type SessionInput } from '@/lib/mockApi';
import { useAuthStore } from '@/stores/authStore';
import type {
  CampaignId,
  GameSession,
  SessionId,
  SessionStatus,
  UserId,
} from '@/types';

const SESSIONS_KEY = ['sessions'] as const;

function useUserId(): UserId {
  const id = useAuthStore((s) => s.user?.id);
  if (!id) throw new Error('Não autenticado');
  return id;
}

export function useSessionsQuery(campaignId: CampaignId | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...SESSIONS_KEY, campaignId, userId],
    queryFn: () => sessionsApi.list(userId as UserId, campaignId as CampaignId),
    enabled: Boolean(userId && campaignId),
  });
}

export function useSessionQuery(sessionId: SessionId | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...SESSIONS_KEY, 'detail', sessionId, userId],
    queryFn: () => sessionsApi.get(userId as UserId, sessionId as SessionId),
    enabled: Boolean(userId && sessionId),
  });
}

export function useCreateSessionMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (input: SessionInput): Promise<GameSession> =>
      sessionsApi.create(userId, campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...SESSIONS_KEY, campaignId] });
    },
  });
}

export function useUpdateSessionMutation() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({
      sessionId,
      patch,
    }: {
      sessionId: SessionId;
      patch: Partial<Pick<GameSession, 'title' | 'scheduledAt' | 'summary' | 'summaryPublished'>>;
    }) => sessionsApi.update(userId, sessionId, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...SESSIONS_KEY, data.campaignId] });
      qc.invalidateQueries({ queryKey: [...SESSIONS_KEY, 'detail', data.id] });
    },
  });
}

export function useSetSessionStatusMutation() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: SessionId; status: SessionStatus }) =>
      sessionsApi.setStatus(userId, sessionId, status),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...SESSIONS_KEY, data.campaignId] });
      qc.invalidateQueries({ queryKey: [...SESSIONS_KEY, 'detail', data.id] });
    },
  });
}

export function useSetAttendanceMutation() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: ({
      sessionId,
      userId: targetId,
      present,
    }: {
      sessionId: SessionId;
      userId: UserId;
      present: boolean;
    }) => sessionsApi.setAttendance(userId, sessionId, targetId, present),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...SESSIONS_KEY, data.campaignId] });
      qc.invalidateQueries({ queryKey: [...SESSIONS_KEY, 'detail', data.id] });
    },
  });
}

export function useDeleteSessionMutation(campaignId: CampaignId) {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: (sessionId: SessionId) => sessionsApi.delete(userId, sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...SESSIONS_KEY, campaignId] });
    },
  });
}
