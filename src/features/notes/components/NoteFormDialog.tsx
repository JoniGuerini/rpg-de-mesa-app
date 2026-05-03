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
import {
  useCreateNoteMutation,
  useUpdateNoteMutation,
} from '@/features/notes/api';
import { toast } from '@/hooks/useToast';
import { ApiError } from '@/lib/mockApi';
import type { CampaignId, Note, NoteVisibility } from '@/types';

const schema = z.object({
  title: z.string().min(1, 'Informe um título'),
  content: z.string().min(0).max(8000),
  tagsRaw: z.string().optional(),
  visibility: z.enum(['master', 'shared', 'personal']),
  pinned: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface NoteFormDialogProps {
  campaignId: CampaignId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note;
  isMaster: boolean;
}

const VISIBILITY_OPTIONS: {
  value: NoteVisibility;
  label: string;
  description: string;
}[] = [
  { value: 'shared', label: 'Compartilhada', description: 'Todos os participantes veem' },
  { value: 'personal', label: 'Pessoal', description: 'Apenas você vê' },
  { value: 'master', label: 'Privada do mestre', description: 'Apenas mestre/co-mestre veem' },
];

export function NoteFormDialog({
  campaignId,
  open,
  onOpenChange,
  note,
  isMaster,
}: NoteFormDialogProps): JSX.Element {
  const isEdit = Boolean(note);
  const create = useCreateNoteMutation(campaignId);
  const update = useUpdateNoteMutation(campaignId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      tagsRaw: '',
      visibility: 'personal',
      pinned: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: note?.title ?? '',
        content: note?.content ?? '',
        tagsRaw: note?.tags.join(', ') ?? '',
        visibility: note?.visibility ?? (isMaster ? 'master' : 'personal'),
        pinned: note?.pinned ?? false,
      });
    }
  }, [open, note, form, isMaster]);

  const onSubmit = form.handleSubmit(async (values) => {
    const tags = (values.tagsRaw ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      title: values.title,
      content: values.content,
      tags,
      visibility: values.visibility,
      pinned: values.pinned,
    };
    try {
      if (isEdit && note) {
        await update.mutateAsync({ id: note.id, patch: payload });
        toast({ title: 'Nota atualizada' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Nota criada' });
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  });

  const isPending = create.isPending || update.isPending;
  const visibilityOptions = VISIBILITY_OPTIONS.filter((o) => o.value !== 'master' || isMaster);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar nota' : 'Nova nota'}</DialogTitle>
          <DialogDescription>
            Use tags separadas por vírgula para organizar (ex.: <em>plot, recap, npc</em>).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="note-title">Título</Label>
            <Input id="note-title" autoFocus {...form.register('title')} />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-content">Conteúdo</Label>
            <Textarea id="note-content" rows={6} {...form.register('content')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="note-tags">Tags</Label>
              <Input id="note-tags" placeholder="plot, recap" {...form.register('tagsRaw')} />
            </div>
            <div className="space-y-2">
              <Label>Visibilidade</Label>
              <Select
                value={form.watch('visibility')}
                onValueChange={(v) => form.setValue('visibility', v as NoteVisibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label} — {o.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.watch('pinned')}
              onChange={(e) => form.setValue('pinned', e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Fixar no topo
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? 'Salvar' : 'Criar nota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
