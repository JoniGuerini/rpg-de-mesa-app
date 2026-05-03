import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Loader2, Pencil, Plus, Skull, Trash2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { NpcFormDialog } from '@/features/npcs/components/NpcFormDialog';
import { NpcVisibilityPanel } from '@/features/npcs/components/NpcVisibilityPanel';
import {
  useDeleteNpcMutation,
  useNpcsQuery,
} from '@/features/npcs/api';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useCampaignRole } from '@/features/campaigns/hooks/useCampaignRole';
import { authApi, ApiError } from '@/lib/mockApi';
import { toast } from '@/hooks/useToast';
import type { NPC, NpcStatus } from '@/types';

const STATUS_LABEL: Record<NpcStatus, string> = {
  alive: 'Vivo',
  wounded: 'Ferido',
  dead: 'Morto',
  unknown: 'Desconhecido',
  ally: 'Aliado',
  hostile: 'Hostil',
};

const STATUS_VARIANT: Record<
  NpcStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'muted' | 'info'
> = {
  alive: 'success',
  wounded: 'warning',
  dead: 'muted',
  unknown: 'secondary',
  ally: 'info',
  hostile: 'danger',
};

export function NpcListPage(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaignQuery = useCampaignQuery(campaignId);
  const role = useCampaignRole(campaignQuery.data);
  const npcsQuery = useNpcsQuery(campaignId);
  const usersQuery = useQuery({
    queryKey: ['mock-users'],
    queryFn: () => authApi.listUsers(),
    enabled: role.isMaster,
  });

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<NPC | null>(null);
  const [visibilityNpc, setVisibilityNpc] = useState<NPC | null>(null);

  const filtered = useMemo(() => {
    const list = npcsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        (n.faction ?? '').toLowerCase().includes(q),
    );
  }, [npcsQuery.data, search]);

  if (!campaignId) return <p>Campanha inválida.</p>;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="NPCs"
        description={
          role.isMaster
            ? 'Cadastre NPCs e controle quais jogadores já os descobriram.'
            : 'NPCs que você já descobriu nesta campanha.'
        }
        actions={
          role.isMaster ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Novo NPC
            </Button>
          ) : null
        }
      />

      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nome, descrição ou facção…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {npcsQuery.isLoading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando NPCs…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={role.isMaster ? 'Sem NPCs ainda' : 'Você ainda não conhece nenhum NPC'}
          description={
            role.isMaster
              ? 'Crie seu primeiro NPC para começar a popular o mundo.'
              : 'Conforme você os descobrir nas sessões, eles aparecerão aqui.'
          }
          action={
            role.isMaster ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Novo NPC
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              canManage={role.isMaster}
              onEdit={() => setEditingNpc(npc)}
              onVisibility={() => setVisibilityNpc(npc)}
              campaignId={campaignId}
            />
          ))}
        </div>
      )}

      {role.isMaster ? (
        <>
          <NpcFormDialog
            campaignId={campaignId}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
          <NpcFormDialog
            campaignId={campaignId}
            open={Boolean(editingNpc)}
            onOpenChange={(o) => {
              if (!o) setEditingNpc(null);
            }}
            npc={editingNpc ?? undefined}
          />
          {campaignQuery.data && visibilityNpc ? (
            <NpcVisibilityPanel
              campaign={campaignQuery.data}
              npc={visibilityNpc}
              users={usersQuery.data ?? []}
              open
              onOpenChange={(o) => {
                if (!o) setVisibilityNpc(null);
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

interface NpcCardProps {
  npc: NPC;
  canManage: boolean;
  campaignId: string;
  onEdit: () => void;
  onVisibility: () => void;
}

function NpcCard({ npc, canManage, campaignId, onEdit, onVisibility }: NpcCardProps): JSX.Element {
  const del = useDeleteNpcMutation(campaignId);

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`Excluir o NPC "${npc.name}"?`)) return;
    try {
      await del.mutateAsync(npc.id);
      toast({ title: 'NPC excluído' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  const initials = npc.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <Avatar className="h-12 w-12 rounded-lg">
          {npc.imageUrl ? <AvatarImage src={npc.imageUrl} alt="" /> : null}
          <AvatarFallback className="rounded-lg">
            {initials || <Skull className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate text-base">{npc.name}</CardTitle>
            <Badge variant={STATUS_VARIANT[npc.status]}>{STATUS_LABEL[npc.status]}</Badge>
          </div>
          <CardDescription className="line-clamp-1">
            {[npc.role, npc.faction].filter(Boolean).join(' • ') || 'Sem facção'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {npc.description || 'Sem descrição.'}
        </p>
        {canManage ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Revelado para{' '}
              <strong className="text-foreground">{npc.revealedTo.length}</strong> jogador(es)
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" onClick={onVisibility}>
                <Eye /> Revelar para jogador
              </Button>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={del.isPending}
                aria-label="Excluir NPC"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
