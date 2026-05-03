import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, CalendarDays, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SessionFormDialog } from '@/features/sessions/components/SessionFormDialog';
import {
  useDeleteSessionMutation,
  useSessionsQuery,
} from '@/features/sessions/api';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useCampaignRole } from '@/features/campaigns/hooks/useCampaignRole';
import { ApiError } from '@/lib/mockApi';
import { toast } from '@/hooks/useToast';
import type { GameSession, SessionStatus } from '@/types';

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

export function SessionListPage(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaignQuery = useCampaignQuery(campaignId);
  const role = useCampaignRole(campaignQuery.data);
  const sessionsQuery = useSessionsQuery(campaignId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<GameSession | null>(null);

  if (!campaignId) return <p>Campanha inválida.</p>;
  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Sessões"
        description={
          role.isMaster
            ? 'Crie sessões, controle status (iniciar/pausar/encerrar) e registre presença.'
            : 'Sessões desta campanha.'
        }
        actions={
          role.isMaster ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Nova sessão
            </Button>
          ) : null
        }
      />

      {sessionsQuery.isLoading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma sessão ainda"
          description={
            role.isMaster ? 'Agende a primeira sessão da campanha.' : 'Aguardando o mestre.'
          }
          action={
            role.isMaster ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Nova sessão
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              campaignId={campaignId}
              canManage={role.isMaster}
              onEdit={() => setEditing(s)}
            />
          ))}
        </div>
      )}

      {role.isMaster ? (
        <>
          <SessionFormDialog
            campaignId={campaignId}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
          <SessionFormDialog
            campaignId={campaignId}
            open={Boolean(editing)}
            onOpenChange={(o) => {
              if (!o) setEditing(null);
            }}
            session={editing ?? undefined}
          />
        </>
      ) : null}
    </div>
  );
}

interface SessionRowProps {
  session: GameSession;
  campaignId: string;
  canManage: boolean;
  onEdit: () => void;
}

function SessionRow({ session, campaignId, canManage, onEdit }: SessionRowProps): JSX.Element {
  const del = useDeleteSessionMutation(campaignId);

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`Excluir a sessão "${session.title}"?`)) return;
    try {
      await del.mutateAsync(session.id);
      toast({ title: 'Sessão excluída' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{session.title}</CardTitle>
          <CardDescription>
            Agendada para {format(parseISO(session.scheduledAt), "PPp", { locale: ptBR })}
          </CardDescription>
        </div>
        <Badge variant={STATUS_VARIANT[session.status]}>{STATUS_LABEL[session.status]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {session.attendance.filter((a) => a.present).length} / {session.attendance.length}{' '}
          presença(s) registrada(s)
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <>
              <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar sessão">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDelete}
                disabled={del.isPending}
                aria-label="Excluir sessão"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : null}
          <Button asChild size="sm">
            <Link to={`/app/campanhas/${campaignId}/sessoes/${session.id}`}>
              Abrir <ArrowRight className="ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
