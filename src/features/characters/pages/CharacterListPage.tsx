import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Heart, Loader2, Plus, Sword } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { CharacterFormDialog } from '@/features/characters/components/CharacterFormDialog';
import { useCharactersQuery } from '@/features/characters/api';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useCampaignRole } from '@/features/campaigns/hooks/useCampaignRole';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/mockApi';
import type { Character } from '@/types';

export function CharacterListPage(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaignQuery = useCampaignQuery(campaignId);
  const role = useCampaignRole(campaignQuery.data);
  const charactersQuery = useCharactersQuery(campaignId);
  const userId = useAuthStore((s) => s.user?.id);
  const usersQuery = useQuery({
    queryKey: ['mock-users'],
    queryFn: () => authApi.listUsers(),
  });

  const [open, setOpen] = useState(false);

  if (!campaignId) return <p>Campanha inválida.</p>;
  const characters = charactersQuery.data ?? [];

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Personagens"
        description="Fichas de personagem e atributos básicos."
        actions={
          campaignQuery.data && userId ? (
            <Button onClick={() => setOpen(true)}>
              <Plus /> Novo personagem
            </Button>
          ) : null
        }
      />

      {charactersQuery.isLoading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : characters.length === 0 ? (
        <EmptyState
          icon={Sword}
          title="Sem personagens ainda"
          description="Crie a primeira ficha desta campanha."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus /> Novo personagem
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => (
            <CharacterCard
              key={c.id}
              character={c}
              campaignId={campaignId}
              ownerName={usersQuery.data?.find((u) => u.id === c.ownerId)?.name ?? c.ownerId}
            />
          ))}
        </div>
      )}

      {campaignQuery.data && userId ? (
        <CharacterFormDialog
          campaign={campaignQuery.data}
          open={open}
          onOpenChange={setOpen}
          isMaster={role.isMaster}
          defaultOwnerId={userId}
        />
      ) : null}
    </div>
  );
}

interface CharacterCardProps {
  character: Character;
  campaignId: string;
  ownerName: string;
}

function CharacterCard({ character, campaignId, ownerName }: CharacterCardProps): JSX.Element {
  const initials = character.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const hpPercent = character.hpMax > 0 ? Math.round((character.hpCurrent / character.hpMax) * 100) : 0;
  const hpColor =
    hpPercent > 60 ? 'bg-emerald-500' : hpPercent > 30 ? 'bg-amber-500' : 'bg-destructive';
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <Avatar className="h-12 w-12 rounded-lg">
          <AvatarFallback className="rounded-lg text-base">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{character.name}</CardTitle>
          <CardDescription>
            {character.classe} • Nível {character.level}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3 text-destructive" /> HP
            </span>
            <span className="font-medium">
              {character.hpCurrent} / {character.hpMax}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${hpColor}`}
              style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Attr label="FOR" value={character.attributes.forca} />
          <Attr label="DES" value={character.attributes.destreza} />
          <Attr label="CON" value={character.attributes.constituicao} />
          <Attr label="INT" value={character.attributes.inteligencia} />
          <Attr label="SAB" value={character.attributes.sabedoria} />
          <Attr label="CAR" value={character.attributes.carisma} />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge variant="muted" className="truncate">
            {ownerName}
          </Badge>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/app/campanhas/${campaignId}/personagens/${character.id}`}>
              Abrir ficha <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Attr({ label, value }: { label: string; value: number }): JSX.Element {
  const mod = Math.floor((value - 10) / 2);
  const sign = mod >= 0 ? '+' : '';
  return (
    <div className="flex flex-col items-center rounded-md border border-border bg-muted/30 py-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-[10px] text-muted-foreground">
        {sign}
        {mod}
      </span>
    </div>
  );
}
