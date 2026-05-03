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
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} from '@/features/campaigns/api';
import { toast } from '@/hooks/useToast';
import { ApiError } from '@/lib/mockApi';
import type { Campaign, CampaignStatus } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  description: z.string().min(0).max(500, 'Máximo 500 caracteres'),
  system: z.string().min(1, 'Informe o sistema'),
  language: z.string().min(2, 'Informe o idioma'),
  status: z.enum(['planning', 'active', 'paused', 'finished']),
});

type FormValues = z.infer<typeof schema>;

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign;
}

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'planning', label: 'Em planejamento' },
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'finished', label: 'Finalizada' },
];

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
}: CampaignFormDialogProps): JSX.Element {
  const isEdit = Boolean(campaign);
  const create = useCreateCampaignMutation();
  const update = useUpdateCampaignMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: campaign?.name ?? '',
      description: campaign?.description ?? '',
      system: campaign?.system ?? 'D&D 5e',
      language: campaign?.language ?? 'pt-BR',
      status: campaign?.status ?? 'planning',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: campaign?.name ?? '',
        description: campaign?.description ?? '',
        system: campaign?.system ?? 'D&D 5e',
        language: campaign?.language ?? 'pt-BR',
        status: campaign?.status ?? 'planning',
      });
    }
  }, [open, campaign, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit && campaign) {
        await update.mutateAsync({ id: campaign.id, patch: values });
        toast({ title: 'Campanha atualizada' });
      } else {
        await create.mutateAsync(values);
        toast({ title: 'Campanha criada' });
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
          <DialogTitle>{isEdit ? 'Editar campanha' : 'Nova campanha'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Ajuste os dados da campanha. Apenas o mestre/co-mestre pode editar.'
              : 'Você se tornará o mestre desta campanha.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nome</Label>
            <Input id="campaign-name" {...form.register('name')} autoFocus />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-description">Descrição</Label>
            <Textarea
              id="campaign-description"
              rows={3}
              {...form.register('description')}
              placeholder="Resumo do tom, premissa e mundo da campanha…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="campaign-system">Sistema</Label>
              <Input id="campaign-system" {...form.register('system')} placeholder="D&D 5e" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-language">Idioma</Label>
              <Input id="campaign-language" {...form.register('language')} placeholder="pt-BR" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(value) => form.setValue('status', value as CampaignStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? 'Salvar' : 'Criar campanha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
