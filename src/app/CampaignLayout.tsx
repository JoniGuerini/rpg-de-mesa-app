import { useEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCampaignQuery } from '@/features/campaigns/api';
import { useActiveCampaignStore } from '@/stores/activeCampaignStore';

export function CampaignLayout(): JSX.Element {
  const { campaignId } = useParams<{ campaignId: string }>();
  const setActive = useActiveCampaignStore((s) => s.setActiveCampaign);
  const query = useCampaignQuery(campaignId);

  useEffect(() => {
    if (campaignId) setActive(campaignId);
  }, [campaignId, setActive]);

  if (query.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando campanha…
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <Navigate to="/app/campanhas" replace />;
  }
  return <Outlet />;
}
