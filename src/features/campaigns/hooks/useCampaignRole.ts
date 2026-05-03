import { useAuthStore } from '@/stores/authStore';
import type { Campaign, CampaignRole } from '@/types';

export interface CampaignRoleInfo {
  role: CampaignRole | null;
  isMaster: boolean;
  isPlayer: boolean;
  isObserver: boolean;
  isMember: boolean;
}

export function useCampaignRole(campaign: Campaign | undefined | null): CampaignRoleInfo {
  const userId = useAuthStore((s) => s.user?.id);
  if (!campaign || !userId) {
    return {
      role: null,
      isMaster: false,
      isPlayer: false,
      isObserver: false,
      isMember: false,
    };
  }
  const role = campaign.members.find((m) => m.userId === userId)?.role ?? null;
  return {
    role,
    isMaster: role === 'master' || role === 'co-master',
    isPlayer: role === 'player',
    isObserver: role === 'observer',
    isMember: role !== null,
  };
}
