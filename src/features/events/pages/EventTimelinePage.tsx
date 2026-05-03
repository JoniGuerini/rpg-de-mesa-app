import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CircleDot,
  Eye,
  EyeOff,
  ListTodo,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { EventFormDialog } from '@/features/events/components/EventFormDialog';
import { useDeleteEventMutation, useEventsQuery } from '@/features/events/api';
import { useSessionsQuery } from '@/features/sessions/api';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useCampaignRole } from '@/features/campaigns/hooks/useCampaignRole';
import { ApiError, authApi } from '@/lib/mockApi';
import { toast } from '@/hooks/useToast';
import type { CampaignEvent, EventVisibility } from '@/types';

const VISIBILITY_LABEL: Record<EventVisibility, string> = {
  public: 'Público',
  private: 'Privado',
  restricted: 'Restrito',
};

export function EventTimelinePage(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaignQuery = useCampaignQuery(campaignId);
  const role = useCampaignRole(campaignQuery.data);
  const eventsQuery = useEventsQuery(campaignId);
  const sessionsQuery = useSessionsQuery(campaignId);
  const usersQuery = useQuery({
    queryKey: ['mock-users'],
    queryFn: () => authApi.listUsers(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignEvent | null>(null);

  if (!campaignId || !campaignQuery.data) return <p>Campanha inválida.</p>;

  const events = eventsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Timeline de eventos"
        description={
          role.isMaster
            ? 'Registre os acontecimentos da campanha e controle a visibilidade de cada um.'
            : 'Linha do tempo dos eventos que você pode acessar nesta campanha.'
        }
        actions={
          role.isMaster ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Novo evento
            </Button>
          ) : null
        }
      />

      {eventsQuery.isLoading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando timeline…
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nenhum evento ainda"
          description={
            role.isMaster
              ? 'Registre o primeiro acontecimento para começar a construir sua memória da campanha.'
              : 'Os eventos visíveis para você aparecerão aqui.'
          }
          action={
            role.isMaster ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Novo evento
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ol className="relative ml-3 space-y-5 border-l border-border pl-6">
          {events.map((ev) => (
            <TimelineItem
              key={ev.id}
              event={ev}
              session={sessions.find((s) => s.id === ev.sessionId)?.title}
              canManage={role.isMaster}
              onEdit={() => setEditing(ev)}
              campaignId={campaignId}
            />
          ))}
        </ol>
      )}

      {role.isMaster ? (
        <>
          <EventFormDialog
            campaign={campaignQuery.data}
            sessions={sessions}
            users={users}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
          <EventFormDialog
            campaign={campaignQuery.data}
            sessions={sessions}
            users={users}
            open={Boolean(editing)}
            onOpenChange={(o) => {
              if (!o) setEditing(null);
            }}
            event={editing ?? undefined}
          />
        </>
      ) : null}
    </div>
  );
}

interface TimelineItemProps {
  event: CampaignEvent;
  session: string | undefined;
  canManage: boolean;
  campaignId: string;
  onEdit: () => void;
}

function TimelineItem({
  event,
  session,
  canManage,
  campaignId,
  onEdit,
}: TimelineItemProps): JSX.Element {
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
      <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-primary">
        {event.visibility === 'private' ? (
          <Lock className="h-2.5 w-2.5 text-primary-foreground" />
        ) : event.visibility === 'restricted' ? (
          <EyeOff className="h-2.5 w-2.5 text-primary-foreground" />
        ) : (
          <CircleDot className="h-2.5 w-2.5 text-primary-foreground" />
        )}
      </span>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">{event.title}</h3>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(event.occurredAt), "PPp", { locale: ptBR })}
              {session ? ` • ${session}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                event.visibility === 'public'
                  ? 'success'
                  : event.visibility === 'private'
                    ? 'danger'
                    : 'warning'
              }
            >
              {event.visibility === 'public' ? <Eye className="h-3 w-3" /> : null}
              {event.visibility === 'private' ? <Lock className="h-3 w-3" /> : null}
              {event.visibility === 'restricted' ? <EyeOff className="h-3 w-3" /> : null}
              {VISIBILITY_LABEL[event.visibility]}
            </Badge>
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
