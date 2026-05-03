import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  CalendarClock,
  CircleStop,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Pause,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/PageHeader';
import { EventFormDialog } from '@/features/events/components/EventFormDialog';
import {
  useDeleteEventMutation,
  useSessionEventsQuery,
} from '@/features/events/api';
import {
  useSessionQuery,
  useSetAttendanceMutation,
  useSetSessionStatusMutation,
  useUpdateSessionMutation,
} from '@/features/sessions/api';
import { useSessionsQuery } from '@/features/sessions/api';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useCampaignRole } from '@/features/campaigns/hooks/useCampaignRole';
import { ApiError, authApi } from '@/lib/mockApi';
import { toast } from '@/hooks/useToast';
import type {
  CampaignEvent,
  EventVisibility,
  GameSession,
  SessionStatus,
  User,
} from '@/types';

const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: 'Agendada',
  in_progress: 'Em andamento',
  paused: 'Pausada',
  finished: 'Finalizada',
};

const STATUS_VARIANT: Record<
  SessionStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'muted'
> = {
  scheduled: 'secondary',
  in_progress: 'success',
  paused: 'warning',
  finished: 'muted',
};

export function SessionDetailPage(): JSX.Element {
  const { campaignId, sessionId } = useParams<{ campaignId: string; sessionId: string }>();
  const navigate = useNavigate();
  const campaignQuery = useCampaignQuery(campaignId);
  const sessionQuery = useSessionQuery(sessionId);
  const role = useCampaignRole(campaignQuery.data);
  const eventsQuery = useSessionEventsQuery(sessionId);
  const sessionsQuery = useSessionsQuery(campaignId);
  const usersQuery = useQuery({
    queryKey: ['mock-users'],
    queryFn: () => authApi.listUsers(),
  });

  const setStatus = useSetSessionStatusMutation();
  const setAttendance = useSetAttendanceMutation();
  const updateSession = useUpdateSessionMutation();

  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CampaignEvent | null>(null);
  const [summaryDraft, setSummaryDraft] = useState('');

  useEffect(() => {
    if (sessionQuery.data) setSummaryDraft(sessionQuery.data.summary ?? '');
  }, [sessionQuery.data]);

  if (sessionQuery.isLoading || campaignQuery.isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
      </div>
    );
  }
  if (!sessionQuery.data || !campaignQuery.data) return <p>Sessão não encontrada.</p>;

  const session = sessionQuery.data;
  const campaign = campaignQuery.data;
  const events = eventsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const handleStatus = async (status: SessionStatus): Promise<void> => {
    try {
      await setStatus.mutateAsync({ sessionId: session.id, status });
      toast({ title: `Sessão ${STATUS_LABEL[status].toLowerCase()}` });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  const handleAttendance = async (userId: string, present: boolean): Promise<void> => {
    try {
      await setAttendance.mutateAsync({ sessionId: session.id, userId, present });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  const handleSaveSummary = async (publish: boolean): Promise<void> => {
    try {
      await updateSession.mutateAsync({
        sessionId: session.id,
        patch: { summary: summaryDraft, summaryPublished: publish },
      });
      toast({
        title: publish ? 'Resumo publicado' : 'Resumo salvo',
        description: publish ? 'Os jogadores agora podem ler o resumo.' : 'Apenas você vê.',
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/app/campanhas/${campaignId}/sessoes`)}>
        <ArrowLeft /> Voltar para sessões
      </Button>

      <PageHeader
        title={session.title}
        description={`Agendada para ${format(parseISO(session.scheduledAt), 'PPp', { locale: ptBR })}`}
        actions={<Badge variant={STATUS_VARIANT[session.status]}>{STATUS_LABEL[session.status]}</Badge>}
      />

      {role.isMaster ? <StatusActions session={session} onStatus={handleStatus} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <AttendancePanel
          session={session}
          users={users}
          canManage={role.isMaster}
          onToggle={handleAttendance}
        />
        {role.isMaster || (session.summaryPublished && session.summary) ? (
          <SummaryPanel
            session={session}
            canManage={role.isMaster}
            value={summaryDraft}
            onChange={setSummaryDraft}
            onSave={() => handleSaveSummary(session.summaryPublished)}
            onPublish={() => handleSaveSummary(true)}
            saving={updateSession.isPending}
          />
        ) : null}
      </div>

      <Separator />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Eventos da sessão</h2>
          {role.isMaster ? (
            <Button size="sm" onClick={() => setCreateEventOpen(true)}>
              <Plus /> Novo evento
            </Button>
          ) : null}
        </div>
        {eventsQuery.isLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando eventos…
          </div>
        ) : events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Nenhum evento registrado nesta sessão.
          </p>
        ) : (
          <ol className="relative ml-3 space-y-3 border-l border-border pl-6">
            {events.map((ev) => (
              <SessionEventItem
                key={ev.id}
                event={ev}
                canManage={role.isMaster}
                campaignId={campaignId!}
                onEdit={() => setEditingEvent(ev)}
              />
            ))}
          </ol>
        )}
      </div>

      {role.isMaster ? (
        <>
          <EventFormDialog
            campaign={campaign}
            sessions={sessionsQuery.data ?? []}
            users={users}
            open={createEventOpen}
            onOpenChange={setCreateEventOpen}
            defaultSessionId={session.id}
          />
          <EventFormDialog
            campaign={campaign}
            sessions={sessionsQuery.data ?? []}
            users={users}
            open={Boolean(editingEvent)}
            onOpenChange={(o) => {
              if (!o) setEditingEvent(null);
            }}
            event={editingEvent ?? undefined}
          />
        </>
      ) : null}
    </div>
  );
}

interface StatusActionsProps {
  session: GameSession;
  onStatus: (status: SessionStatus) => void;
}

function StatusActions({ session, onStatus }: StatusActionsProps): JSX.Element {
  const canStart = session.status === 'scheduled' || session.status === 'paused';
  const canPause = session.status === 'in_progress';
  const canFinish = session.status === 'in_progress' || session.status === 'paused';
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <span className="text-xs text-muted-foreground">
        <CalendarClock className="mr-1 inline h-3 w-3" />
        Controle da sessão:
      </span>
      <Button size="sm" disabled={!canStart} onClick={() => onStatus('in_progress')}>
        <Play /> Iniciar
      </Button>
      <Button size="sm" variant="outline" disabled={!canPause} onClick={() => onStatus('paused')}>
        <Pause /> Pausar
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={!canFinish}
        onClick={() => onStatus('finished')}
      >
        <CircleStop /> Encerrar
      </Button>
    </div>
  );
}

interface AttendancePanelProps {
  session: GameSession;
  users: User[];
  canManage: boolean;
  onToggle: (userId: string, present: boolean) => void;
}

function AttendancePanel({
  session,
  users,
  canManage,
  onToggle,
}: AttendancePanelProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-4 w-4" /> Presença
        </CardTitle>
        <CardDescription>
          {session.attendance.filter((a) => a.present).length} de {session.attendance.length}{' '}
          presentes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {session.attendance.map((a) => {
            const user = users.find((u) => u.id === a.userId);
            return (
              <li key={a.userId} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user?.name ?? a.userId}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
                {canManage ? (
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={a.present}
                      onChange={(e) => onToggle(a.userId, e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Presente
                  </label>
                ) : (
                  <Badge variant={a.present ? 'success' : 'muted'}>
                    {a.present ? 'Presente' : 'Ausente'}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

interface SummaryPanelProps {
  session: GameSession;
  canManage: boolean;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
}

function SummaryPanel({
  session,
  canManage,
  value,
  onChange,
  onSave,
  onPublish,
  saving,
}: SummaryPanelProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumo da sessão</CardTitle>
        <CardDescription>
          {session.summaryPublished
            ? 'Publicado para os jogadores.'
            : canManage
              ? 'Ainda não publicado. Apenas você vê.'
              : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canManage ? (
          <>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={6}
              placeholder="Resumo dos eventos importantes desta sessão…"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                Salvar rascunho
              </Button>
              <Button size="sm" onClick={onPublish} disabled={saving}>
                {session.summaryPublished ? 'Atualizar publicação' : 'Publicar para jogadores'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled
                title="Em breve — Fase 4"
                className="ml-auto"
              >
                <Sparkles /> Gerar resumo (em breve)
              </Button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {session.summary || 'Sem resumo publicado ainda.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface SessionEventItemProps {
  event: CampaignEvent;
  canManage: boolean;
  campaignId: string;
  onEdit: () => void;
}

function SessionEventItem({
  event,
  canManage,
  campaignId,
  onEdit,
}: SessionEventItemProps): JSX.Element {
  const del = useDeleteEventMutation(campaignId);
  const handleDelete = async (): Promise<void> => {
    if (!window.confirm('Excluir evento?')) return;
    try {
      await del.mutateAsync(event.id);
      toast({ title: 'Evento excluído' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };
  return (
    <li className="relative">
      <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
      <div className="rounded-md border border-border bg-card p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">{event.title}</h4>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(event.occurredAt), "PPp", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <VisibilityBadge visibility={event.visibility} />
            {canManage ? (
              <>
                <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar evento">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={del.isPending}
                  aria-label="Excluir evento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {event.description ? (
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
            {event.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function VisibilityBadge({ visibility }: { visibility: EventVisibility }): JSX.Element {
  if (visibility === 'public') {
    return (
      <Badge variant="success">
        <Eye className="h-3 w-3" /> Público
      </Badge>
    );
  }
  if (visibility === 'private') {
    return (
      <Badge variant="danger">
        <Lock className="h-3 w-3" /> Privado
      </Badge>
    );
  }
  return (
    <Badge variant="warning">
      <EyeOff className="h-3 w-3" /> Restrito
    </Badge>
  );
}
