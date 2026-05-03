import { Outlet, useParams } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { Sidebar } from '@/app/layout/Sidebar';
import { Topbar } from '@/app/layout/Topbar';

export function AppLayout(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>();
  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <Topbar />
        <div className="flex min-h-0 flex-1">
          <Sidebar campaignId={campaignId} />
          <main className="scrollbar-thin flex-1 overflow-y-auto bg-background">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
