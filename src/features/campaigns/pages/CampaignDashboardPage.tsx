import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowRight,
  CalendarClock,
  Loader2,
  Pencil,
  Pin,
  Sparkles,
  Sword,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { CampaignFormDialog } from '@/features/campaigns/components/CampaignFormDialog';
import { MembersPanel } from '@/features/campaigns/components/MembersPanel';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useCampaignRole } from '@/features/campaigns/hooks/useCampaignRole';
import { useSessionsQuery } from '@/features/sessions/api';
import { useEventsQuery } from '@/features/events/api';
import { useNotesQuery } from '@/features/notes/api';
import { useNpcsQuery } from '@/features/npcs/api';
import { useCharactersQuery } from '@/features/characters/api';
import type {
  Campaign,
  CampaignEvent,
  CampaignStatus,
  GameSession,
  NPC,
  Note,
} from '@/types';

const STATUS_LABEL: Record<CampaignStatus, string> = {
  planning: 'Planejamento',
  active: 'Ativa',
  paused: 'Pausada',
  finished: 'Finalizada',
};

export function CampaignDashboardPage(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaignQuery = useCampaignQuery(campaignId);
  const role = useCampaignRole(campaignQuery.data);
  const sessionsQuery = useSessionsQuery(campaignId);
  const eventsQuery = useEventsQuery(campaignId);
  const notesQuery = useNotesQuery(campaignId);
  const npcsQuery = useNpcsQuery(campaignId);
  const charactersQuery = useCharactersQuery(campaignId);

  const [editOpen, setEditOpen] = useState(false);

  if (campaignQuery.isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
      </div>
    );
  }
  const campaign = campaignQuery.data;
  if (!campaign || !campaignId) return <p>Campanha não encontrada.</p>;

  const sessions = sessionsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const npcs = npcsQuery.data ?? [];
  const characters = charactersQuery.data ?? [];

  const lastSession = [...sessions]
    .filter((s) => s.status === 'finished')
    .sort((a, b) => (b.endedAt ?? b.scheduledAt).localeCompare(a.endedAt ?? a.scheduledAt))[0];

  const nextSession = [...sessions]
    .filter((s) => s.status === 'scheduled' || s.status === 'in_progress' || s.status === 'paused')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];

  const now = new Date();
  const upcomingEvents = events
    .filter((e) => isAfter(parseISO(e.occurredAt), now))
    .slice(0, 4);

  const recentNpcs = [...npcs]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);

  const pinnedNotes = notes.filter((n) => n.pinned).slice(0, 4);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={campaign.name}
        description={campaign.description || 'Sem descrição.'}
        actions={
          role.isMaster ? (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Editar campanha
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{campaign.system}</Badge>
        <Badge variant="outline">{campaign.language}</Badge>
        <Badge variant="muted">{STATUS_LABEL[campaign.status]}</Badge>
        {role.role ? <Badge>{roleHumanLabel(role.role)}</Badge> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NextSessionCard session={nextSession} campaignId={campaignId} />
        <LastSessionCard session={lastSession} campaignId={campaignId} />
        <StatsCard
          campaign={campaign}
          npcCount={npcs.length}
          characterCount={characters.length}
        />
        <UpcomingEventsCard events={upcomingEvents} campaignId={campaignId} />
        <RecentNpcsCard npcs={recentNpcs} campaignId={campaignId} canManage={role.isMaster} />
        <PinnedNotesCard notes={pinnedNotes} campaignId={campaignId} />
      </div>

      <MembersPanel campaign={campaign} canManage={role.isMaster} />

      <CampaignFormDialog open={editOpen} onOpenChange={setEditOpen} campaign={campaign} />
    </div>
  );
}

function roleHumanLabel(role: 'master' | 'co-master' | 'player' | 'observer'): string {
  switch (role) {
    case 'master':
      return 'Você é mestre';
    case 'co-master':
      return 'Você é co-mestre';
    case 'player':
      return 'Você é jogador';
    case 'observer':
      return 'Você é observador';
  }
}

interface SessionCardProps {
  session: GameSession | undefined;
  campaignId: string;
}

function NextSessionCard({ session, campaignId }: SessionCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" /> Próxima sessão
        </CardTitle>
      </CardHeader>
      <CardContent>
        {session ? (
          <div className="space-y-2">
            <Link
              to={`/app/campanhas/${campaignId}/sessoes/${session.id}`}
              className="block text-sm font-semibold hover:underline"
            >
              {session.title}
            </Link>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(session.scheduledAt), 'PPp', { locale: ptBR })}
            </p>
            <Badge variant="secondary">{session.status === 'in_progress' ? 'Em andamento' : 'Agendada'}</Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma sessão agendada.</p>
        )}
      </CardContent>
    </Card>
  );
}

function LastSessionCard({ session, campaignId }: SessionCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Última sessão</CardTitle>
      </CardHeader>
      <CardContent>
        {session ? (
          <div className="space-y-2">
            <Link
              to={`/app/campanhas/${campaignId}/sessoes/${session.id}`}
              className="block text-sm font-semibold hover:underline"
            >
              {session.title}
            </Link>
            <p className="text-xs text-muted-foreground">
              Encerrada em{' '}
              {format(parseISO(session.endedAt ?? session.scheduledAt), 'PPp', { locale: ptBR })}
            </p>
            {session.summaryPublished && session.summary ? (
              <p className="line-clamp-3 text-sm text-muted-foreground">{session.summary}</p>
            ) : (
              <p className="text-xs italic text-muted-foreground">Sem resumo publicado.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma sessão concluída ainda.</p>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsCardProps {
  campaign: Campaign;
  npcCount: number;
  characterCount: number;
}

function StatsCard({ campaign, npcCount, characterCount }: StatsCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visão geral</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" /> Participantes
            </span>
            <span className="font-medium">{campaign.members.length}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4" /> NPCs visíveis
            </span>
            <span className="font-medium">{npcCount}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Sword className="h-4 w-4" /> Personagens
            </span>
            <span className="font-medium">{characterCount}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

interface UpcomingEventsCardProps {
  events: CampaignEvent[];
  campaignId: string;
}

function UpcomingEventsCard({ events, campaignId }: UpcomingEventsCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Próximos eventos</CardTitle>
        <CardDescription>Marcados para o futuro.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem eventos futuros visíveis.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-border bg-muted/30 p-2 text-sm"
              >
                <p className="line-clamp-1 font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(e.occurredAt), 'PPp', { locale: ptBR })}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="ghost" size="sm" className="mt-3 px-0">
          <Link to={`/app/campanhas/${campaignId}/eventos`}>
            Ver timeline <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface RecentNpcsCardProps {
  npcs: NPC[];
  campaignId: string;
  canManage: boolean;
}

function RecentNpcsCard({ npcs, campaignId, canManage }: RecentNpcsCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">NPCs recentes</CardTitle>
        <CardDescription>
          {canManage ? 'Atualizados recentemente.' : 'NPCs que você descobriu.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {npcs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum NPC ainda.</p>
        ) : (
          <ul className="space-y-2">
            {npcs.map((n) => {
              const initials = n.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('');
              return (
                <li key={n.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {n.faction ?? n.role ?? '—'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Button asChild variant="ghost" size="sm" className="mt-3 px-0">
          <Link to={`/app/campanhas/${campaignId}/npcs`}>
            Ver NPCs <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface PinnedNotesCardProps {
  notes: Note[];
  campaignId: string;
}

function PinnedNotesCard({ notes, campaignId }: PinnedNotesCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Pin className="h-4 w-4" /> Notas fixadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma nota fixada.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-md border border-border bg-muted/30 p-2 text-sm"
              >
                <p className="line-clamp-1 font-medium">{n.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="ghost" size="sm" className="mt-3 px-0">
          <Link to={`/app/campanhas/${campaignId}/notas`}>
            Ver notas <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
