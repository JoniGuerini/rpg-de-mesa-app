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
import {
  useCreateSessionMutation,
  useUpdateSessionMutation,
} from '@/features/sessions/api';
import { toast } from '@/hooks/useToast';
import { ApiError } from '@/lib/mockApi';
import type { CampaignId, GameSession } from '@/types';

const schema = z.object({
  title: z.string().min(2, 'Mínimo 2 caracteres'),
  scheduledAt: z.string().min(1, 'Informe a data'),
});

type FormValues = z.infer<typeof schema>;

function toLocal(iso: string): string {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

interface SessionFormDialogProps {
  campaignId: CampaignId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: GameSession;
}

export function SessionFormDialog({
  campaignId,
  open,
  onOpenChange,
  session,
}: SessionFormDialogProps): JSX.Element {
  const isEdit = Boolean(session);
  const create = useCreateSessionMutation(campaignId);
  const update = useUpdateSessionMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      scheduledAt: toLocal(new Date().toISOString()),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: session?.title ?? '',
        scheduledAt: toLocal(session?.scheduledAt ?? new Date().toISOString()),
      });
    }
  }, [open, session, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      scheduledAt: new Date(values.scheduledAt).toISOString(),
    };
    try {
      if (isEdit && session) {
        await update.mutateAsync({ sessionId: session.id, patch: payload });
        toast({ title: 'Sessão atualizada' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Sessão criada' });
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  });

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar sessão' : 'Nova sessão'}</DialogTitle>
          <DialogDescription>
            Após criar, você poderá iniciar, pausar e finalizar a sessão.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="ses-title">Título</Label>
            <Input id="ses-title" autoFocus {...form.register('title')} />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ses-when">Agendada para</Label>
            <Input id="ses-when" type="datetime-local" {...form.register('scheduledAt')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
