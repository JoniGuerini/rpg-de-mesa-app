import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateNpcMutation, useUpdateNpcMutation } from '@/features/npcs/api';
import { toast } from '@/hooks/useToast';
import { ApiError } from '@/lib/mockApi';
import type { CampaignId, NPC, NpcStatus } from '@/types';

const STATUS_OPTIONS: { value: NpcStatus; label: string }[] = [
  { value: 'alive', label: 'Vivo' },
  { value: 'wounded', label: 'Ferido' },
  { value: 'dead', label: 'Morto' },
  { value: 'unknown', label: 'Desconhecido' },
  { value: 'ally', label: 'Aliado' },
  { value: 'hostile', label: 'Hostil' },
];

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  description: z.string().min(0).max(2000, 'Máximo 2000 caracteres'),
  role: z.string().optional(),
  faction: z.string().optional(),
  status: z.enum(['alive', 'wounded', 'dead', 'unknown', 'ally', 'hostile']),
  imageUrl: z.string().url('URL inválida').or(z.literal('')).optional(),
});

type FormValues = z.infer<typeof schema>;

interface NpcFormDialogProps {
  campaignId: CampaignId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  npc?: NPC;
}

export function NpcFormDialog({
  campaignId,
  open,
  onOpenChange,
  npc,
}: NpcFormDialogProps): JSX.Element {
  const isEdit = Boolean(npc);
  const create = useCreateNpcMutation(campaignId);
  const update = useUpdateNpcMutation(campaignId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      role: '',
      faction: '',
      status: 'alive',
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: npc?.name ?? '',
        description: npc?.description ?? '',
        role: npc?.role ?? '',
        faction: npc?.faction ?? '',
        status: npc?.status ?? 'alive',
        imageUrl: npc?.imageUrl ?? '',
      });
    }
  }, [open, npc, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      description: values.description,
      role: values.role || undefined,
      faction: values.faction || undefined,
      status: values.status,
      imageUrl: values.imageUrl || undefined,
    };
    try {
      if (isEdit && npc) {
        await update.mutateAsync({ id: npc.id, patch: payload });
        toast({ title: 'NPC atualizado' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'NPC criado' });
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao salvar';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  });

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar NPC' : 'Novo NPC'}</DialogTitle>
          <DialogDescription>
            NPCs são invisíveis para os jogadores até que o mestre os revele explicitamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="npc-name">Nome</Label>
            <Input id="npc-name" autoFocus {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="npc-role">Papel</Label>
              <Input id="npc-role" placeholder="Mentor, vilão…" {...form.register('role')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npc-faction">Facção</Label>
              <Input
                id="npc-faction"
                placeholder="Ordem do Crepúsculo…"
                {...form.register('faction')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as NpcStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="npc-image">URL da imagem (opcional)</Label>
            <Input
              id="npc-image"
              placeholder="https://…"
              {...form.register('imageUrl')}
            />
            {form.formState.errors.imageUrl ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.imageUrl.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="npc-description">Descrição</Label>
            <Textarea id="npc-description" rows={4} {...form.register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? 'Salvar' : 'Criar NPC'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
