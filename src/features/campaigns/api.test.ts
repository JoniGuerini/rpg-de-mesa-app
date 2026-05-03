import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockApi, ApiError } from '@/lib/mockApi';
import { resetDatabase } from '@/lib/mockStorage';

const MASTER_ID = 'user-master';
const PLAYER_1_ID = 'user-player-1';
const CAMPAIGN_ID = 'camp-vale-sombrio';

describe('mockApi.campaigns', () => {
  beforeEach(() => {
    resetDatabase();
    mockApi.resetToSeed();
  });
  afterEach(() => {
    resetDatabase();
  });

  it('lista apenas campanhas das quais o usuário participa', async () => {
    const list = await mockApi.campaigns.list(MASTER_ID);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(CAMPAIGN_ID);
  });

  it('cria campanha e adiciona o criador como mestre', async () => {
    const created = await mockApi.campaigns.create(PLAYER_1_ID, {
      name: 'Caminho dos Astros',
      description: 'Aventura espacial',
      system: 'Stars Without Number',
      language: 'pt-BR',
      status: 'planning',
    });
    expect(created.ownerId).toBe(PLAYER_1_ID);
    expect(created.members).toEqual([
      expect.objectContaining({ userId: PLAYER_1_ID, role: 'master' }),
    ]);
  });

  it('jogador não pode editar campanha (apenas mestre/co-mestre)', async () => {
    await expect(
      mockApi.campaigns.update(PLAYER_1_ID, CAMPAIGN_ID, { name: 'hack' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('mestre pode adicionar membro à campanha', async () => {
    // Criar nova campanha sem players
    const newCamp = await mockApi.campaigns.create(MASTER_ID, {
      name: 'Nova',
      description: '',
      system: 'D&D',
      language: 'pt-BR',
      status: 'planning',
    });
    expect(newCamp.members).toHaveLength(1);
    const member = await mockApi.campaigns.addMember(
      MASTER_ID,
      newCamp.id,
      PLAYER_1_ID,
      'player',
    );
    expect(member.role).toBe('player');

    const updated = await mockApi.campaigns.get(MASTER_ID, newCamp.id);
    expect(updated.members.some((m) => m.userId === PLAYER_1_ID && m.role === 'player')).toBe(
      true,
    );
  });

  it('não permite adicionar o mesmo usuário duas vezes', async () => {
    await expect(
      mockApi.campaigns.addMember(MASTER_ID, CAMPAIGN_ID, PLAYER_1_ID, 'player'),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('não pode rebaixar o dono da campanha', async () => {
    await expect(
      mockApi.campaigns.changeMemberRole(MASTER_ID, CAMPAIGN_ID, MASTER_ID, 'player'),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('jogador que não participa recebe 403 ao buscar campanha', async () => {
    const newCamp = await mockApi.campaigns.create(MASTER_ID, {
      name: 'Privada',
      description: '',
      system: 'D&D',
      language: 'pt-BR',
      status: 'planning',
    });
    await expect(mockApi.campaigns.get(PLAYER_1_ID, newCamp.id)).rejects.toBeInstanceOf(ApiError);
  });
});
