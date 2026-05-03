import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
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
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
} from '@/features/characters/api';
import { toast } from '@/hooks/useToast';
import { ApiError, authApi } from '@/lib/mockApi';
import type { Campaign, Character, UserId } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  classe: z.string().min(1, 'Informe a classe'),
  level: z.coerce.number().int().min(1, 'Mínimo 1').max(30, 'Máximo 30'),
  hpCurrent: z.coerce.number().int().min(0),
  hpMax: z.coerce.number().int().min(1),
  forca: z.coerce.number().int().min(1).max(30),
  destreza: z.coerce.number().int().min(1).max(30),
  constituicao: z.coerce.number().int().min(1).max(30),
  inteligencia: z.coerce.number().int().min(1).max(30),
  sabedoria: z.coerce.number().int().min(1).max(30),
  carisma: z.coerce.number().int().min(1).max(30),
  notes: z.string().optional(),
  ownerId: z.string().min(1, 'Selecione o dono'),
});

type FormValues = z.infer<typeof schema>;

interface CharacterFormDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: Character;
  isMaster: boolean;
  defaultOwnerId: UserId;
}

export function CharacterFormDialog({
  campaign,
  open,
  onOpenChange,
  character,
  isMaster,
  defaultOwnerId,
}: CharacterFormDialogProps): JSX.Element {
  const isEdit = Boolean(character);
  const create = useCreateCharacterMutation(campaign.id);
  const update = useUpdateCharacterMutation(campaign.id);
  const usersQuery = useQuery({
    queryKey: ['mock-users'],
    queryFn: () => authApi.listUsers(),
  });
  const users = usersQuery.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      classe: '',
      level: 1,
      hpCurrent: 10,
      hpMax: 10,
      forca: 10,
      destreza: 10,
      constituicao: 10,
      inteligencia: 10,
      sabedoria: 10,
      carisma: 10,
      notes: '',
      ownerId: defaultOwnerId,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: character?.name ?? '',
        classe: character?.classe ?? '',
        level: character?.level ?? 1,
        hpCurrent: character?.hpCurrent ?? 10,
        hpMax: character?.hpMax ?? 10,
        forca: character?.attributes.forca ?? 10,
        destreza: character?.attributes.destreza ?? 10,
        constituicao: character?.attributes.constituicao ?? 10,
        inteligencia: character?.attributes.inteligencia ?? 10,
        sabedoria: character?.attributes.sabedoria ?? 10,
        carisma: character?.attributes.carisma ?? 10,
        notes: character?.notes ?? '',
        ownerId: character?.ownerId ?? defaultOwnerId,
      });
    }
  }, [open, character, form, defaultOwnerId]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      classe: values.classe,
      level: values.level,
      hpCurrent: values.hpCurrent,
      hpMax: values.hpMax,
      attributes: {
        forca: values.forca,
        destreza: values.destreza,
        constituicao: values.constituicao,
        inteligencia: values.inteligencia,
        sabedoria: values.sabedoria,
        carisma: values.carisma,
      },
      notes: values.notes,
    };
    try {
      if (isEdit && character) {
        await update.mutateAsync({ id: character.id, patch: payload });
        toast({ title: 'Ficha atualizada' });
      } else {
        await create.mutateAsync({ ...payload, ownerId: values.ownerId });
        toast({ title: 'Personagem criado' });
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar ficha' : 'Novo personagem'}</DialogTitle>
          <DialogDescription>
            Preencha atributos básicos. Você poderá ajustar HP e equipamentos depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ch-name">Nome</Label>
              <Input id="ch-name" autoFocus {...form.register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-classe">Classe</Label>
              <Input id="ch-classe" placeholder="Guerreiro, Mago…" {...form.register('classe')} />
            </div>
          </div>
          {!isEdit && isMaster ? (
            <div className="space-y-2">
              <Label>Dono do personagem</Label>
              <Select
                value={form.watch('ownerId')}
                onValueChange={(v) => form.setValue('ownerId', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {campaign.members.map((m) => {
                    const u = users.find((user) => user.id === m.userId);
                    return (
                      <SelectItem key={m.userId} value={m.userId}>
                        {u?.name ?? m.userId}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ch-level">Nível</Label>
              <Input id="ch-level" type="number" {...form.register('level')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-hp">HP atual</Label>
              <Input id="ch-hp" type="number" {...form.register('hpCurrent')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-hpmax">HP máximo</Label>
              <Input id="ch-hpmax" type="number" {...form.register('hpMax')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3">
            {(
              [
                ['forca', 'Força'],
                ['destreza', 'Destreza'],
                ['constituicao', 'Constituição'],
                ['inteligencia', 'Inteligência'],
                ['sabedoria', 'Sabedoria'],
                ['carisma', 'Carisma'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`ch-${key}`} className="text-xs">
                  {label}
                </Label>
                <Input id={`ch-${key}`} type="number" {...form.register(key)} />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-notes">Notas</Label>
            <Textarea id="ch-notes" rows={3} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? 'Salvar' : 'Criar personagem'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
