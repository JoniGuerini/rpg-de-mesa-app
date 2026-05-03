import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockApi } from '@/lib/mockApi';
import { resetDatabase } from '@/lib/mockStorage';

const MASTER_ID = 'user-master';
const PLAYER_1_ID = 'user-player-1';
const PLAYER_2_ID = 'user-player-2';
const CAMPAIGN_ID = 'camp-vale-sombrio';

describe('mockApi.events — visibilidade pública/privada/restrita', () => {
  beforeEach(() => {
    resetDatabase();
    mockApi.resetToSeed();
  });
  afterEach(() => {
    resetDatabase();
  });

  it('mestre vê eventos públicos e privados (incluindo "Vesper observa o grupo")', async () => {
    const list = await mockApi.events.listByCampaign(MASTER_ID, CAMPAIGN_ID);
    const titles = list.map((e) => e.title);
    expect(titles).toContain('Vesper observa o grupo à distância');
  });

  it('jogador NÃO vê eventos privados do mestre', async () => {
    const list = await mockApi.events.listByCampaign(PLAYER_1_ID, CAMPAIGN_ID);
    const visibilities = list.map((e) => e.visibility);
    expect(visibilities).not.toContain('private');
    const titles = list.map((e) => e.title);
    expect(titles).not.toContain('Vesper observa o grupo à distância');
  });

  it('eventos restritos só aparecem para usuários listados em visibleTo', async () => {
    // Criar evento restrito apenas para player 1
    await mockApi.events.create(MASTER_ID, CAMPAIGN_ID, {
      title: 'Sussurro no escuro',
      description: 'Lyra escuta um sussurro que ninguém mais ouve.',
      occurredAt: new Date().toISOString(),
      visibility: 'restricted',
      visibleTo: [PLAYER_1_ID],
    });

    const player1Events = await mockApi.events.listByCampaign(PLAYER_1_ID, CAMPAIGN_ID);
    const player2Events = await mockApi.events.listByCampaign(PLAYER_2_ID, CAMPAIGN_ID);
    expect(player1Events.some((e) => e.title === 'Sussurro no escuro')).toBe(true);
    expect(player2Events.some((e) => e.title === 'Sussurro no escuro')).toBe(false);
  });

  it('mudar visibilidade de "restricted" para "public" limpa visibleTo', async () => {
    const ev = await mockApi.events.create(MASTER_ID, CAMPAIGN_ID, {
      title: 'Evento de teste',
      description: 'x',
      occurredAt: new Date().toISOString(),
      visibility: 'restricted',
      visibleTo: [PLAYER_1_ID],
    });
    expect(ev.visibleTo).toEqual([PLAYER_1_ID]);
    const updated = await mockApi.events.update(MASTER_ID, ev.id, { visibility: 'public' });
    expect(updated.visibility).toBe('public');
    expect(updated.visibleTo).toEqual([]);
  });
});
