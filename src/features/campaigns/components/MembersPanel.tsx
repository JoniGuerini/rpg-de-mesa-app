import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAddMemberMutation,
  useChangeMemberRoleMutation,
  useRemoveMemberMutation,
} from '@/features/campaigns/api';
import { authApi, ApiError } from '@/lib/mockApi';
import { toast } from '@/hooks/useToast';
import type { Campaign, CampaignRole, User } from '@/types';

const ROLE_LABEL: Record<CampaignRole, string> = {
  master: 'Mestre',
  'co-master': 'Co-mestre',
  player: 'Jogador',
  observer: 'Observador',
};

const ROLE_OPTIONS: CampaignRole[] = ['master', 'co-master', 'player', 'observer'];

interface MembersPanelProps {
  campaign: Campaign;
  canManage: boolean;
}

export function MembersPanel({ campaign, canManage }: MembersPanelProps): JSX.Element {
  const usersQuery = useQuery({
    queryKey: ['mock-users'],
    queryFn: () => authApi.listUsers(),
  });

  const memberIds = useMemo(
    () => new Set(campaign.members.map((m) => m.userId)),
    [campaign.members],
  );
  const allUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const availableUsers = useMemo(
    () => allUsers.filter((u) => !memberIds.has(u.id)),
    [allUsers, memberIds],
  );

  const addMember = useAddMemberMutation();
  const removeMember = useRemoveMemberMutation();
  const changeRole = useChangeMemberRoleMutation();

  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<CampaignRole>('player');

  const memberRecords = useMemo(() => {
    return campaign.members.map((m) => ({
      ...m,
      user: allUsers.find((u) => u.id === m.userId),
    }));
  }, [campaign.members, allUsers]);

  const handleInvite = async (): Promise<void> => {
    if (!selectedUser) return;
    try {
      await addMember.mutateAsync({
        campaignId: campaign.id,
        userId: selectedUser,
        role: selectedRole,
      });
      toast({ title: 'Convite enviado', description: 'Membro adicionado à campanha.' });
      setSelectedUser('');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao convidar';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  const handleRemove = async (userId: string): Promise<void> => {
    try {
      await removeMember.mutateAsync({ campaignId: campaign.id, userId });
      toast({ title: 'Membro removido' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao remover';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  const handleChangeRole = async (userId: string, role: CampaignRole): Promise<void> => {
    try {
      await changeRole.mutateAsync({ campaignId: campaign.id, userId, role });
      toast({ title: 'Papel atualizado' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao atualizar papel';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participantes</CardTitle>
        <CardDescription>
          {canManage
            ? 'Convide jogadores e atribua papéis (mestre, co-mestre, jogador, observador).'
            : 'Lista de quem está na campanha.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="sm:flex-1">
                <SelectValue placeholder="Selecione um usuário para convidar" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    Nenhum usuário disponível
                  </SelectItem>
                ) : (
                  availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as CampaignRole)}
            >
              <SelectTrigger className="sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={handleInvite}
              disabled={!selectedUser || addMember.isPending}
            >
              {addMember.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Convidar
            </Button>
          </div>
        ) : null}

        <ul className="divide-y divide-border rounded-lg border border-border">
          {memberRecords.map((m) => (
            <MemberRow
              key={m.userId}
              user={m.user}
              role={m.role}
              isOwner={m.userId === campaign.ownerId}
              canManage={canManage}
              onChangeRole={(role) => handleChangeRole(m.userId, role)}
              onRemove={() => handleRemove(m.userId)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

interface MemberRowProps {
  user: User | undefined;
  role: CampaignRole;
  isOwner: boolean;
  canManage: boolean;
  onChangeRole: (role: CampaignRole) => void;
  onRemove: () => void;
}

function MemberRow({
  user,
  role,
  isOwner,
  canManage,
  onChangeRole,
  onRemove,
}: MemberRowProps): JSX.Element {
  const initials = (user?.name ?? '??')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{user?.name ?? 'Usuário'}</p>
          {isOwner ? <Badge variant="muted">Dono</Badge> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      {canManage && !isOwner ? (
        <div className="flex items-center gap-2">
          <Select value={role} onValueChange={(v) => onChangeRole(v as CampaignRole)}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Remover membro"
            onClick={onRemove}
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Badge variant="outline">{ROLE_LABEL[role]}</Badge>
      )}
    </li>
  );
}
