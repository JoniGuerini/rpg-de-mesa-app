import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart, Loader2, Pencil, Shield, Sword, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CharacterFormDialog } from '@/features/characters/components/CharacterFormDialog';
import {
  useCharacterQuery,
  useDeleteCharacterMutation,
  useUpdateCharacterMutation,
} from '@/features/characters/api';
import { useInventoryQuery } from '@/features/inventory/api';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useCampaignRole } from '@/features/campaigns/hooks/useCampaignRole';
import { useAuthStore } from '@/stores/authStore';
import { ApiError, authApi } from '@/lib/mockApi';
import { toast } from '@/hooks/useToast';
import type { Character } from '@/types';

export function CharacterDetailPage(): JSX.Element {
  const { campaignId, characterId } = useParams<{
    campaignId: string;
    characterId: string;
  }>();
  const navigate = useNavigate();
  const characterQuery = useCharacterQuery(characterId);
  const campaignQuery = useCampaignQuery(campaignId);
  const role = useCampaignRole(campaignQuery.data);
  const inventoryQuery = useInventoryQuery(campaignId);
  const usersQuery = useQuery({
    queryKey: ['mock-users'],
    queryFn: () => authApi.listUsers(),
  });
  const userId = useAuthStore((s) => s.user?.id);
  const [editOpen, setEditOpen] = useState(false);

  if (characterQuery.isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando ficha…
      </div>
    );
  }
  const character = characterQuery.data;
  const campaign = campaignQuery.data;
  if (!character || !campaign || !campaignId) return <p>Ficha não encontrada.</p>;

  const isOwner = character.ownerId === userId;
  const canEdit = isOwner || role.isMaster;
  const ownerName =
    usersQuery.data?.find((u) => u.id === character.ownerId)?.name ?? character.ownerId;

  const equipped =
    inventoryQuery.data?.entries
      .filter((e) => e.characterId === character.id && e.equipped)
      .map((e) => ({
        entry: e,
        item: inventoryQuery.data?.items.find((i) => i.id === e.itemId),
      })) ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/app/campanhas/${campaignId}/personagens`)}
      >
        <ArrowLeft /> Voltar
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 rounded-xl">
            <AvatarFallback className="rounded-xl text-lg">
              {character.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{character.name}</h1>
            <p className="text-sm text-muted-foreground">
              {character.classe} • Nível {character.level} • {ownerName}
            </p>
          </div>
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Editar
            </Button>
            <DeleteAction character={character} campaignId={campaignId} />
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <HpCard character={character} canEdit={canEdit} campaignId={campaignId} />
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Atributos</CardTitle>
            <CardDescription>Modificadores em parênteses (D&D 5e).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <Attribute label="Força" value={character.attributes.forca} />
              <Attribute label="Destreza" value={character.attributes.destreza} />
              <Attribute label="Constituição" value={character.attributes.constituicao} />
              <Attribute label="Inteligência" value={character.attributes.inteligencia} />
              <Attribute label="Sabedoria" value={character.attributes.sabedoria} />
              <Attribute label="Carisma" value={character.attributes.carisma} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" /> Equipamentos
          </CardTitle>
          <CardDescription>
            Itens equipados pelo personagem. Use a tela de Inventário para ajustes detalhados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {equipped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item equipado.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {equipped.map(({ entry, item }) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-card p-3"
                >
                  <Sword className="h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item?.name ?? 'Item'}</p>
                    <p className="truncate text-xs text-muted-foreground">{item?.description}</p>
                  </div>
                  <Badge variant="muted" className="ml-auto">
                    x{entry.quantity}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {character.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{character.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {canEdit ? (
        <CharacterFormDialog
          campaign={campaign}
          open={editOpen}
          onOpenChange={setEditOpen}
          character={character}
          isMaster={role.isMaster}
          defaultOwnerId={character.ownerId}
        />
      ) : null}
    </div>
  );
}

function Attribute({ label, value }: { label: string; value: number }): JSX.Element {
  const mod = Math.floor((value - 10) / 2);
  const sign = mod >= 0 ? '+' : '';
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-muted/30 p-3">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-sm text-muted-foreground">
        ({sign}
        {mod})
      </span>
    </div>
  );
}

interface HpCardProps {
  character: Character;
  canEdit: boolean;
  campaignId: string;
}

function HpCard({ character, canEdit, campaignId }: HpCardProps): JSX.Element {
  const update = useUpdateCharacterMutation(campaignId);
  const [draft, setDraft] = useState(character.hpCurrent.toString());

  const apply = async (next: number): Promise<void> => {
    const clamped = Math.max(0, Math.min(character.hpMax, next));
    setDraft(clamped.toString());
    if (clamped === character.hpCurrent) return;
    try {
      await update.mutateAsync({ id: character.id, patch: { hpCurrent: clamped } });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  const hpPercent =
    character.hpMax > 0 ? Math.round((character.hpCurrent / character.hpMax) * 100) : 0;
  const hpColor =
    hpPercent > 60 ? 'bg-emerald-500' : hpPercent > 30 ? 'bg-amber-500' : 'bg-destructive';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4 text-destructive" /> Pontos de vida
        </CardTitle>
        <CardDescription>
          {character.hpCurrent} / {character.hpMax} HP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className={`h-full transition-all ${hpColor}`} style={{ width: `${hpPercent}%` }} />
        </div>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => apply(character.hpCurrent - 1)}>
              -1
            </Button>
            <Button variant="outline" size="sm" onClick={() => apply(character.hpCurrent - 5)}>
              -5
            </Button>
            <div className="space-y-1">
              <Label htmlFor="hp-current" className="sr-only">
                HP atual
              </Label>
              <Input
                id="hp-current"
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => apply(Number(draft))}
                className="h-8 w-20 text-center"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => apply(character.hpCurrent + 1)}>
              +1
            </Button>
            <Button variant="outline" size="sm" onClick={() => apply(character.hpCurrent + 5)}>
              +5
            </Button>
          </div>
        ) : null}
        <Separator />
        <div className="text-xs text-muted-foreground">Capacidade máxima: {character.hpMax}</div>
      </CardContent>
    </Card>
  );
}

interface DeleteActionProps {
  character: Character;
  campaignId: string;
}

function DeleteAction({ character, campaignId }: DeleteActionProps): JSX.Element {
  const navigate = useNavigate();
  const del = useDeleteCharacterMutation(campaignId);
  const handle = async (): Promise<void> => {
    if (!window.confirm(`Excluir o personagem "${character.name}"?`)) return;
    try {
      await del.mutateAsync(character.id);
      toast({ title: 'Personagem excluído' });
      navigate(`/app/campanhas/${campaignId}/personagens`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };
  return (
    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={handle} disabled={del.isPending}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
