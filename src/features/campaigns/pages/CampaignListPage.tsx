import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, Compass, Loader2, Plus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { CampaignFormDialog } from '@/features/campaigns/components/CampaignFormDialog';
import { useCampaignsQuery } from '@/features/campaigns/api';
import { useAuthStore } from '@/stores/authStore';
import type { Campaign, CampaignStatus } from '@/types';

const STATUS_LABEL: Record<CampaignStatus, string> = {
  planning: 'Planejamento',
  active: 'Ativa',
  paused: 'Pausada',
  finished: 'Finalizada',
};

const STATUS_VARIANT: Record<
  CampaignStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'muted'
> = {
  planning: 'secondary',
  active: 'success',
  paused: 'warning',
  finished: 'muted',
};

export function CampaignListPage(): JSX.Element {
  const { data, isLoading } = useCampaignsQuery();
  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);

  const campaigns = useMemo(() => data ?? [], [data]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Minhas campanhas"
        description="Selecione uma campanha para entrar no hub ou crie uma nova."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> Nova campanha
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Você ainda não participa de nenhuma campanha"
          description="Crie a sua primeira campanha para começar a organizar suas sessões."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus /> Nova campanha
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} currentUserId={userId} />
          ))}
        </div>
      )}

      <CampaignFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

interface CampaignCardProps {
  campaign: Campaign;
  currentUserId: string | undefined;
}

function CampaignCard({ campaign, currentUserId }: CampaignCardProps): JSX.Element {
  const myMembership = campaign.members.find((m) => m.userId === currentUserId);
  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{campaign.name}</CardTitle>
          <Badge variant={STATUS_VARIANT[campaign.status]}>{STATUS_LABEL[campaign.status]}</Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {campaign.description || 'Sem descrição.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{campaign.system}</Badge>
          <Badge variant="outline">{campaign.language}</Badge>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {campaign.members.length}
          </span>
          <span>•</span>
          <span>
            Atualizada em{' '}
            {format(parseISO(campaign.updatedAt), "dd 'de' MMM yyyy", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          {myMembership ? (
            <Badge variant="muted" className="capitalize">
              Você é {roleLabel(myMembership.role)}
            </Badge>
          ) : (
            <span />
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to={`/app/campanhas/${campaign.id}`}>
              Entrar <ArrowRight className="ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function roleLabel(role: 'master' | 'co-master' | 'player' | 'observer'): string {
  switch (role) {
    case 'master':
      return 'mestre';
    case 'co-master':
      return 'co-mestre';
    case 'player':
      return 'jogador';
    case 'observer':
      return 'observador';
  }
}
