import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, LogOut, RefreshCw, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useCampaignsQuery } from '@/features/campaigns/api';
import { useActiveCampaignStore } from '@/stores/activeCampaignStore';
import { useAuthStore } from '@/stores/authStore';
import { mockApi } from '@/lib/mockApi';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Topbar(): JSX.Element {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const activeCampaignId = useActiveCampaignStore((s) => s.activeCampaignId);
  const setActiveCampaign = useActiveCampaignStore((s) => s.setActiveCampaign);
  const campaignsQuery = useCampaignsQuery();
  const campaigns = campaignsQuery.data ?? [];

  const handleLogout = (): void => {
    clear();
    qc.clear();
    navigate('/login', { replace: true });
  };

  const handleResetSeed = (): void => {
    mockApi.resetToSeed();
    qc.invalidateQueries();
    toast({
      title: 'Banco mock reiniciado',
      description: 'Os dados de exemplo foram restaurados.',
    });
  };

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden text-xs font-medium uppercase tracking-wider text-muted-foreground sm:inline">
          Campanha ativa
        </span>
        {campaigns.length > 0 ? (
          <Select
            value={activeCampaignId ?? undefined}
            onValueChange={(value) => {
              setActiveCampaign(value);
              navigate(`/app/campanhas/${value}`);
            }}
          >
            <SelectTrigger className="w-[260px] max-w-full">
              <SelectValue placeholder="Selecionar campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">Nenhuma campanha ainda</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Reiniciar dados de exemplo"
          onClick={handleResetSeed}
          title="Reiniciar dados de exemplo"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{user ? initials(user.name) : '??'}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight">{user?.name ?? '—'}</p>
                <p className="text-xs leading-tight text-muted-foreground">{user?.email}</p>
              </div>
              <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[14rem]">
            <DropdownMenuLabel>Conta</DropdownMenuLabel>
            <DropdownMenuItem disabled>
              <UserIcon className="h-4 w-4" />
              {user?.name}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
