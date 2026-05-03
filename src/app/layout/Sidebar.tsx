import { NavLink, useParams } from 'react-router-dom';
import {
  CalendarDays,
  Compass,
  LayoutDashboard,
  ListTodo,
  Package,
  StickyNote,
  Sword,
  Users,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  end?: boolean;
}

interface SidebarProps {
  campaignId?: string;
}

export function Sidebar({ campaignId }: SidebarProps): JSX.Element {
  const { campaignId: paramId } = useParams<{ campaignId: string }>();
  const cid = campaignId ?? paramId;
  const base = cid ? `/app/campanhas/${cid}` : null;

  const items: NavItem[] = base
    ? [
        { to: base, label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: `${base}/sessoes`, label: 'Sessões', icon: CalendarDays },
        { to: `${base}/npcs`, label: 'NPCs', icon: Users },
        { to: `${base}/eventos`, label: 'Eventos', icon: ListTodo },
        { to: `${base}/notas`, label: 'Notas', icon: StickyNote },
        { to: `${base}/inventario`, label: 'Inventário', icon: Package },
        { to: `${base}/personagens`, label: 'Personagens', icon: Sword },
      ]
    : [{ to: '/app/campanhas', label: 'Minhas campanhas', icon: Compass, end: true }];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 pb-2 pt-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sword className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold tracking-tight">Mesa</span>
      </div>

      <nav className="mt-2 flex flex-col gap-0.5 px-2" aria-label="Navegação principal">
        {!base ? (
          <p className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
            Geral
          </p>
        ) : (
          <p className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
            Campanha
          </p>
        )}
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      {base ? (
        <div className="mt-auto px-2 pb-3">
          <NavLink
            to="/app/campanhas"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )
            }
            end
          >
            <Compass className="h-4 w-4" aria-hidden />
            Trocar de campanha
          </NavLink>
        </div>
      ) : null}
    </aside>
  );
}
