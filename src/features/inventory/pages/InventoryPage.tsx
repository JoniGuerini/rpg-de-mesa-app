import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Minus, Package, Plus, Sword } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import {
  useAddInventoryMutation,
  useCreateItemMutation,
  useInventoryQuery,
  useRemoveInventoryMutation,
  useToggleEquippedMutation,
} from '@/features/inventory/api';
import { useCharactersQuery } from '@/features/characters/api';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useCampaignRole } from '@/features/campaigns/hooks/useCampaignRole';
import { ApiError } from '@/lib/mockApi';
import { toast } from '@/hooks/useToast';
import type { CampaignId, Character, InventoryEntry, InventoryItem } from '@/types';

export function InventoryPage(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaignQuery = useCampaignQuery(campaignId);
  const role = useCampaignRole(campaignQuery.data);
  const charactersQuery = useCharactersQuery(campaignId);
  const inventoryQuery = useInventoryQuery(campaignId);

  const characters = useMemo(() => charactersQuery.data ?? [], [charactersQuery.data]);
  const [selectedCharId, setSelectedCharId] = useState<string>('');

  useEffect(() => {
    if (!selectedCharId && characters.length > 0) {
      setSelectedCharId(characters[0].id);
    }
  }, [characters, selectedCharId]);

  if (!campaignId) return <p>Campanha inválida.</p>;

  const inventory = inventoryQuery.data;
  const selectedChar = characters.find((c) => c.id === selectedCharId);

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Inventário"
        description="Itens, consumíveis e objetos especiais por personagem."
      />

      {charactersQuery.isLoading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : characters.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sem personagens nesta campanha"
          description="Crie um personagem na seção Personagens para começar a controlar inventário."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm">Personagem:</Label>
            <Select value={selectedCharId} onValueChange={setSelectedCharId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {characters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.classe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {role.isMaster ? (
              <CreateItemAction campaignId={campaignId} />
            ) : null}
            {selectedChar && inventory ? (
              <AddItemAction
                campaignId={campaignId}
                character={selectedChar}
                items={inventory.items}
              />
            ) : null}
          </div>

          {inventoryQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            </div>
          ) : !selectedChar || !inventory ? null : (
            <div className="grid gap-4 lg:grid-cols-2">
              <CharacterInventory
                campaignId={campaignId}
                character={selectedChar}
                entries={inventory.entries.filter((e) => e.characterId === selectedChar.id)}
                items={inventory.items}
              />
              <InventoryHistoryCard
                entries={inventory.history.filter((h) => h.characterId === selectedChar.id)}
                items={inventory.items}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface CharacterInventoryProps {
  campaignId: CampaignId;
  character: Character;
  entries: InventoryEntry[];
  items: InventoryItem[];
}

function CharacterInventory({
  campaignId,
  character,
  entries,
  items,
}: CharacterInventoryProps): JSX.Element {
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const remove = useRemoveInventoryMutation(campaignId);
  const toggle = useToggleEquippedMutation(campaignId);
  const add = useAddInventoryMutation(campaignId);

  const handleRemove = async (entry: InventoryEntry, quantity: number): Promise<void> => {
    try {
      await remove.mutateAsync({ entryId: entry.id, quantity });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  const handleAddOne = async (entry: InventoryEntry): Promise<void> => {
    try {
      await add.mutateAsync({
        characterId: entry.characterId,
        itemId: entry.itemId,
        quantity: 1,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  const handleToggle = async (entry: InventoryEntry): Promise<void> => {
    try {
      await toggle.mutateAsync(entry.id);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sword className="h-4 w-4" /> {character.name}
        </CardTitle>
        <CardDescription>
          {entries.length} item(ns) — {entries.reduce((acc, e) => acc + e.quantity, 0)} unidade(s)
          no total
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Sem itens. Adicione algo para este personagem.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {entries.map((e) => {
              const item = itemById.get(e.itemId);
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{item?.name ?? 'Item'}</p>
                      {item?.rarity ? <Badge variant="muted">{item.rarity}</Badge> : null}
                      {e.equipped ? <Badge variant="info">Equipado</Badge> : null}
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {item?.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(e, 1)}
                      disabled={remove.isPending}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[2ch] text-center text-sm font-medium">
                      {e.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleAddOne(e)}
                      disabled={add.isPending}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={e.equipped ? 'secondary' : 'outline'}
                      onClick={() => handleToggle(e)}
                      disabled={toggle.isPending}
                    >
                      {e.equipped ? 'Desequipar' : 'Equipar'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface InventoryHistoryCardProps {
  entries: import('@/types').InventoryHistoryEntry[];
  items: InventoryItem[];
}

function InventoryHistoryCard({ entries, items }: InventoryHistoryCardProps): JSX.Element {
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico de movimentações</CardTitle>
        <CardDescription>Últimas alterações no inventário deste personagem.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Sem histórico ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.slice(0, 12).map((h) => {
              const item = itemById.get(h.itemId);
              const positive = h.quantityDelta > 0;
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <Badge variant={positive ? 'success' : 'warning'}>
                    {positive ? '+' : ''}
                    {h.quantityDelta}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item?.name ?? 'Item'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {format(parseISO(h.occurredAt), "dd/MM HH:mm", { locale: ptBR })}
                      {h.note ? ` — ${h.note}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Total: {h.resultingQuantity}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface CreateItemActionProps {
  campaignId: CampaignId;
}

function CreateItemAction({ campaignId }: CreateItemActionProps): JSX.Element {
  const create = useCreateItemMutation(campaignId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rarity, setRarity] = useState<InventoryItem['rarity']>('common');

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name, description, rarity });
      toast({ title: 'Item criado' });
      setOpen(false);
      setName('');
      setDescription('');
      setRarity('common');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> Novo item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo item</DialogTitle>
          <DialogDescription>Cria um item disponível para a campanha.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="item-name">Nome</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-desc">Descrição</Label>
            <Textarea
              id="item-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Raridade</Label>
            <Select
              value={rarity ?? 'common'}
              onValueChange={(v) => setRarity(v as InventoryItem['rarity'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common">Comum</SelectItem>
                <SelectItem value="uncommon">Incomum</SelectItem>
                <SelectItem value="rare">Raro</SelectItem>
                <SelectItem value="epic">Épico</SelectItem>
                <SelectItem value="legendary">Lendário</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending || !name.trim()}>
            {create.isPending ? <Loader2 className="animate-spin" /> : null}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddItemActionProps {
  campaignId: CampaignId;
  character: Character;
  items: InventoryItem[];
}

function AddItemAction({ campaignId, character, items }: AddItemActionProps): JSX.Element {
  const add = useAddInventoryMutation(campaignId);
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState('');

  const handleSubmit = async (): Promise<void> => {
    if (!itemId || quantity <= 0) return;
    try {
      await add.mutateAsync({
        characterId: character.id,
        itemId,
        quantity,
        note: note || undefined,
      });
      toast({ title: 'Item adicionado' });
      setOpen(false);
      setItemId('');
      setQuantity(1);
      setNote('');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Adicionar a {character.name}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar item ao inventário</DialogTitle>
          <DialogDescription>
            Adiciona uma quantidade do item ao personagem {character.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um item…" />
              </SelectTrigger>
              <SelectContent>
                {items.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    Nenhum item criado ainda
                  </SelectItem>
                ) : (
                  items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantidade</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Anotação (opcional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Encontrado em…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={add.isPending || !itemId}>
            {add.isPending ? <Loader2 className="animate-spin" /> : null}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
