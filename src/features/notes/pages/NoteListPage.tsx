import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Eye,
  Loader2,
  Lock,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { NoteFormDialog } from '@/features/notes/components/NoteFormDialog';
import {
  useDeleteNoteMutation,
  useNotesQuery,
  useUpdateNoteMutation,
} from '@/features/notes/api';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useCampaignRole } from '@/features/campaigns/hooks/useCampaignRole';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/lib/mockApi';
import { toast } from '@/hooks/useToast';
import type { Note, NoteVisibility } from '@/types';

const VISIBILITY_LABEL: Record<NoteVisibility, string> = {
  master: 'Privada do mestre',
  shared: 'Compartilhada',
  personal: 'Pessoal',
};

export function NoteListPage(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaignQuery = useCampaignQuery(campaignId);
  const role = useCampaignRole(campaignQuery.data);
  const userId = useAuthStore((s) => s.user?.id);

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const notesQuery = useNotesQuery(
    campaignId,
    useMemo(() => ({ search, tag: tagFilter ?? undefined }), [search, tagFilter]),
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (notesQuery.data ?? []).forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notesQuery.data]);

  if (!campaignId) return <p>Campanha inválida.</p>;

  const notes = notesQuery.data ?? [];

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Notas"
        description="Notas privadas do mestre, notas compartilhadas e suas notas pessoais."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Nova nota
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, conteúdo ou tag…"
            className="pl-9"
          />
        </div>
        {allTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={tagFilter === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTagFilter(null)}
            >
              Todas
            </Badge>
            {allTags.map((t) => (
              <Badge
                key={t}
                variant={tagFilter === t ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setTagFilter((cur) => (cur === t ? null : t))}
              >
                #{t}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {notesQuery.isLoading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Nenhuma nota"
          description="Crie sua primeira nota — pessoal, compartilhada ou privada do mestre."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Nova nota
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              campaignId={campaignId}
              currentUserId={userId}
              isMaster={role.isMaster}
              onEdit={() => setEditing(n)}
            />
          ))}
        </div>
      )}

      <NoteFormDialog
        campaignId={campaignId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        isMaster={role.isMaster}
      />
      <NoteFormDialog
        campaignId={campaignId}
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        note={editing ?? undefined}
        isMaster={role.isMaster}
      />
    </div>
  );
}

interface NoteCardProps {
  note: Note;
  campaignId: string;
  currentUserId: string | undefined;
  isMaster: boolean;
  onEdit: () => void;
}

function NoteCard({
  note,
  campaignId,
  currentUserId,
  isMaster,
  onEdit,
}: NoteCardProps): JSX.Element {
  const update = useUpdateNoteMutation(campaignId);
  const del = useDeleteNoteMutation(campaignId);
  const canEdit = note.authorId === currentUserId || isMaster;

  const togglePin = async (): Promise<void> => {
    try {
      await update.mutateAsync({ id: note.id, patch: { pinned: !note.pinned } });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  const remove = async (): Promise<void> => {
    if (!window.confirm(`Excluir a nota "${note.title}"?`)) return;
    try {
      await del.mutateAsync(note.id);
      toast({ title: 'Nota excluída' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro';
      toast({ title: 'Falha', description: message, variant: 'destructive' });
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base">{note.title}</CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            <VisibilityBadge visibility={note.visibility} />
            {note.pinned ? <Badge variant="secondary">Fixada</Badge> : null}
          </div>
        </div>
        <CardDescription className="text-xs">
          Atualizada em{' '}
          {format(parseISO(note.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <p className="line-clamp-5 whitespace-pre-line text-sm text-muted-foreground">
          {note.content || 'Sem conteúdo.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {note.tags.map((t) => (
            <Badge key={t} variant="outline">
              #{t}
            </Badge>
          ))}
        </div>
        {canEdit ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePin}
              aria-label={note.pinned ? 'Desafixar' : 'Fixar'}
              disabled={update.isPending}
            >
              {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar nota">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={remove}
              aria-label="Excluir nota"
              disabled={del.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VisibilityBadge({ visibility }: { visibility: NoteVisibility }): JSX.Element {
  if (visibility === 'master') {
    return (
      <Badge variant="danger">
        <Lock className="h-3 w-3" /> {VISIBILITY_LABEL.master}
      </Badge>
    );
  }
  if (visibility === 'shared') {
    return (
      <Badge variant="success">
        <Eye className="h-3 w-3" /> {VISIBILITY_LABEL.shared}
      </Badge>
    );
  }
  return (
    <Badge variant="info">
      <UserIcon className="h-3 w-3" /> {VISIBILITY_LABEL.personal}
    </Badge>
  );
}
