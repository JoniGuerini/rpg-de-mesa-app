import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockApi, ApiError } from '@/lib/mockApi';
import { resetDatabase } from '@/lib/mockStorage';

const MASTER_ID = 'user-master';
const PLAYER_1_ID = 'user-player-1';
const PLAYER_2_ID = 'user-player-2';
const CAMPAIGN_ID = 'camp-vale-sombrio';
const HIDDEN_NPC_ID = 'npc-vesper';
const REVEALED_NPC_ID = 'npc-marn';

describe('mockApi.npcs — regras de visibilidade', () => {
  beforeEach(() => {
    resetDatabase();
    mockApi.resetToSeed();
  });
  afterEach(() => {
    resetDatabase();
  });

  it('mestre vê todos os NPCs da campanha', async () => {
    const list = await mockApi.npcs.list(MASTER_ID, CAMPAIGN_ID);
    const ids = list.map((n) => n.id).sort();
    expect(ids).toContain(HIDDEN_NPC_ID);
    expect(ids).toContain(REVEALED_NPC_ID);
  });

  it('jogador NÃO vê NPCs que não foram revelados a ele', async () => {
    const list = await mockApi.npcs.list(PLAYER_1_ID, CAMPAIGN_ID);
    const ids = list.map((n) => n.id);
    expect(ids).toContain(REVEALED_NPC_ID);
    expect(ids).not.toContain(HIDDEN_NPC_ID);
  });

  it('jogador recebe 403 ao tentar acessar NPC oculto diretamente', async () => {
    await expect(mockApi.npcs.get(PLAYER_1_ID, HIDDEN_NPC_ID)).rejects.toBeInstanceOf(ApiError);
  });

  it('revelar NPC para jogador o torna acessível para ele (e só para ele)', async () => {
    const before = await mockApi.npcs.list(PLAYER_1_ID, CAMPAIGN_ID);
    expect(before.some((n) => n.id === HIDDEN_NPC_ID)).toBe(false);

    await mockApi.npcs.revealTo(MASTER_ID, HIDDEN_NPC_ID, PLAYER_1_ID);

    const afterPlayer1 = await mockApi.npcs.list(PLAYER_1_ID, CAMPAIGN_ID);
    expect(afterPlayer1.some((n) => n.id === HIDDEN_NPC_ID)).toBe(true);

    const afterPlayer2 = await mockApi.npcs.list(PLAYER_2_ID, CAMPAIGN_ID);
    expect(afterPlayer2.some((n) => n.id === HIDDEN_NPC_ID)).toBe(false);
  });

  it('ocultar NPC volta a torná-lo invisível para o jogador', async () => {
    await mockApi.npcs.revealTo(MASTER_ID, HIDDEN_NPC_ID, PLAYER_1_ID);
    let list = await mockApi.npcs.list(PLAYER_1_ID, CAMPAIGN_ID);
    expect(list.some((n) => n.id === HIDDEN_NPC_ID)).toBe(true);

    await mockApi.npcs.hideFrom(MASTER_ID, HIDDEN_NPC_ID, PLAYER_1_ID);
    list = await mockApi.npcs.list(PLAYER_1_ID, CAMPAIGN_ID);
    expect(list.some((n) => n.id === HIDDEN_NPC_ID)).toBe(false);
  });

  it('jogador não pode revelar NPC para si mesmo', async () => {
    await expect(
      mockApi.npcs.revealTo(PLAYER_1_ID, HIDDEN_NPC_ID, PLAYER_1_ID),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
