import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockApi, ApiError } from '@/lib/mockApi';
import { resetDatabase } from '@/lib/mockStorage';

const MASTER_ID = 'user-master';
const PLAYER_1_ID = 'user-player-1';
const CAMPAIGN_ID = 'camp-vale-sombrio';

describe('mockApi.notes — visibilidade', () => {
  beforeEach(() => {
    resetDatabase();
    mockApi.resetToSeed();
  });
  afterEach(() => {
    resetDatabase();
  });

  it('jogador NÃO vê notas privadas do mestre', async () => {
    const list = await mockApi.notes.list(PLAYER_1_ID, CAMPAIGN_ID);
    expect(list.some((n) => n.visibility === 'master')).toBe(false);
  });

  it('jogador vê notas compartilhadas', async () => {
    const list = await mockApi.notes.list(PLAYER_1_ID, CAMPAIGN_ID);
    expect(list.some((n) => n.visibility === 'shared')).toBe(true);
  });

  it('jogador não pode criar nota com visibilidade "master"', async () => {
    await expect(
      mockApi.notes.create(PLAYER_1_ID, CAMPAIGN_ID, {
        title: 'Tentativa',
        content: 'x',
        tags: [],
        visibility: 'master',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('busca por texto (search) filtra por título/conteúdo/tag', async () => {
    const results = await mockApi.notes.list(MASTER_ID, CAMPAIGN_ID, { search: 'recap' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((n) => n.tags.includes('recap'))).toBe(true);
  });

  it('jogador vê apenas as próprias notas pessoais', async () => {
    await mockApi.notes.create(PLAYER_1_ID, CAMPAIGN_ID, {
      title: 'Minha nota',
      content: 'x',
      tags: [],
      visibility: 'personal',
    });
    const player1List = await mockApi.notes.list(PLAYER_1_ID, CAMPAIGN_ID);
    expect(player1List.some((n) => n.title === 'Minha nota')).toBe(true);

    // Outro jogador
    const player2List = await mockApi.notes.list('user-player-2', CAMPAIGN_ID);
    expect(player2List.some((n) => n.title === 'Minha nota')).toBe(false);
  });
});
