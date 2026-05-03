import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CampaignId } from '@/types';

interface ActiveCampaignState {
  activeCampaignId: CampaignId | null;
  setActiveCampaign: (id: CampaignId | null) => void;
}

export const useActiveCampaignStore = create<ActiveCampaignState>()(
  persist(
    (set) => ({
      activeCampaignId: null,
      setActiveCampaign: (id) => set({ activeCampaignId: id }),
    }),
    {
      name: 'mesa.active-campaign',
    },
  ),
);
