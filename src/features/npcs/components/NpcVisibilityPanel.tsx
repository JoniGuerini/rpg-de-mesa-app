import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useHideNpcMutation, useRevealNpcMutation } from '@/features/npcs/api';
import { toast } from '@/hooks/useToast';
import { ApiError } from '@/lib/mockApi';
import type { Campaign, NPC, User } from '@/types';

interface NpcVisibilityPanelProps {
  campaign: Campaign;
  npc: NPC;
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NpcVisibilityPanel({
  campaign,
  npc,
  users,
  open,
  onOpenChange,
}: NpcVisibilityPanelProps): JSX.Element {
  const reveal = useRevealNpcMutation(campaign.id);
  const hide = useHideNpcMutation(campaign.id);

  const eligible = campaign.members
    .filter((m) => m.role === 'player' || m.role === 'observer')
    .map((m) => users.find((u) => u.id === m.userId))
    .filter((u): u is User => Boolean(u));

  const handleToggle = async (userId: string, isRevealed: boolean): Promise<void> => {
    try {
      if (isRevealed) {
        await hide.mutateAsync({ id: npc.id, targetUserId: userId });
        toast({ title: 'NPC ocultado para jogador' });
      } else {
        await reveal.mutateAsync({ id: npc.id, targetUserId: userId });
        toast({ title: 'NPC revelado para jogador' });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Visibilidade — {npc.name}</DialogTitle>
          <DialogDescription>
            Controle quais jogadores e observadores veem este NPC. Mestre/co-mestre veem sempre.
          </DialogDescription>
        </DialogHeader>
        {eligible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta campanha ainda não tem jogadores ou observadores para revelar o NPC.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {eligible.map((user) => {
              const isRevealed = npc.revealedTo.includes(user.id);
              return (
                <li key={user.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={isRevealed ? 'secondary' : 'default'}
                    onClick={() => handleToggle(user.id, isRevealed)}
                    disabled={reveal.isPending || hide.isPending}
                  >
                    {isRevealed ? (
                      <>
                        <EyeOff /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye /> Revelar
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
