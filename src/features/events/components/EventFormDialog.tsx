import { useEffect, useState } from 'react';
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
import {
  useCreateEventMutation,
  useUpdateEventMutation,
} from '@/features/events/api';
import { toast } from '@/hooks/useToast';
import { ApiError } from '@/lib/mockApi';
import type {
  Campaign,
  CampaignEvent,
  EventVisibility,
  GameSession,
  User,
  UserId,
} from '@/types';

const VISIBILITY_OPTIONS: { value: EventVisibility; label: string; description: string }[] = [
  { value: 'public', label: 'Público', description: 'Todos os participantes da campanha veem' },
  { value: 'private', label: 'Privado', description: 'Apenas mestre / co-mestre veem' },
  {
    value: 'restricted',
    label: 'Restrito',
    description: 'Visível apenas para os jogadores selecionados abaixo',
  },
];

const schema = z.object({
  title: z.string().min(2, 'Mínimo 2 caracteres'),
  description: z.string().min(0).max(2000),
  occurredAt: z.string().min(1, 'Informe a data/hora'),
  visibility: z.enum(['public', 'private', 'restricted']),
  sessionId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EventFormDialogProps {
  campaign: Campaign;
  sessions: GameSession[];
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CampaignEvent;
  defaultSessionId?: string;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function fromLocalInputValue(local: string): string {
  return new Date(local).toISOString();
}

export function EventFormDialog({
  campaign,
  sessions,
  users,
  open,
  onOpenChange,
  event,
  defaultSessionId,
}: EventFormDialogProps): JSX.Element {
  const userById = new Map(users.map((u) => [u.id, u] as const));
  const isEdit = Boolean(event);
  const create = useCreateEventMutation(campaign.id);
  const update = useUpdateEventMutation(campaign.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      occurredAt: toLocalInputValue(new Date().toISOString()),
      visibility: 'public',
      sessionId: defaultSessionId,
    },
  });

  const [restrictedTo, setRestrictedTo] = useState<UserId[]>([]);

  useEffect(() => {
    if (open) {
      form.reset({
        title: event?.title ?? '',
        description: event?.description ?? '',
        occurredAt: toLocalInputValue(event?.occurredAt ?? new Date().toISOString()),
        visibility: event?.visibility ?? 'public',
        sessionId: event?.sessionId ?? defaultSessionId ?? '',
      });
      setRestrictedTo(event?.visibleTo ? [...event.visibleTo] : []);
    }
  }, [open, event, defaultSessionId, form]);

  const visibility = form.watch('visibility');
  const candidates = campaign.members.filter(
    (m) => m.role === 'player' || m.role === 'observer',
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      description: values.description,
      occurredAt: fromLocalInputValue(values.occurredAt),
      visibility: values.visibility,
      visibleTo: values.visibility === 'restricted' ? restrictedTo : [],
      sessionId: values.sessionId || undefined,
    };
    try {
      if (isEdit && event) {
        await update.mutateAsync({ id: event.id, patch: payload });
        toast({ title: 'Evento atualizado' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Evento registrado' });
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar evento' : 'Registrar evento'}</DialogTitle>
          <DialogDescription>
            Eventos compõem a timeline da campanha. Marque a visibilidade adequada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="ev-title">Título</Label>
            <Input id="ev-title" autoFocus {...form.register('title')} />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ev-when">Quando</Label>
              <Input id="ev-when" type="datetime-local" {...form.register('occurredAt')} />
            </div>
            <div className="space-y-2">
              <Label>Sessão</Label>
              <Select
                value={form.watch('sessionId') || '__none__'}
                onValueChange={(v) => form.setValue('sessionId', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem sessão (apenas timeline)</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Visibilidade</Label>
            <Select
              value={visibility}
              onValueChange={(v) => form.setValue('visibility', v as EventVisibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label} — {o.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {visibility === 'restricted' ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Marque quem pode ver este evento (mestre/co-mestre veem sempre).
              </p>
              {candidates.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  Não há jogadores ou observadores na campanha.
                </p>
              ) : (
                candidates.map((m) => {
                  const checked = restrictedTo.includes(m.userId);
                  const user = userById.get(m.userId);
                  return (
                    <label
                      key={m.userId}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setRestrictedTo((prev) =>
                            e.target.checked
                              ? [...prev, m.userId]
                              : prev.filter((id) => id !== m.userId),
                          );
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span>{user?.name ?? m.userId}</span>
                    </label>
                  );
                })
              )}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="ev-desc">Descrição</Label>
            <Textarea id="ev-desc" rows={4} {...form.register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
