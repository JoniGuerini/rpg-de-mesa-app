import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockApi, ApiError } from '@/lib/mockApi';
import { resetDatabase } from '@/lib/mockStorage';

const MASTER_ID = 'user-master';
const PLAYER_1_ID = 'user-player-1';
const CAMPAIGN_ID = 'camp-vale-sombrio';
const ITEM_HEAL = 'item-poção-cura';

describe('mockApi.inventory', () => {
  beforeEach(() => {
    resetDatabase();
    mockApi.resetToSeed();
  });
  afterEach(() => {
    resetDatabase();
  });

  it('adiciona item e empilha quantidade quando já existe', async () => {
    const before = await mockApi.inventory.list(MASTER_ID, CAMPAIGN_ID);
    const lyraEntries = before.entries.filter((e) => e.characterId === 'char-lyra');
    const healBefore = lyraEntries.find((e) => e.itemId === ITEM_HEAL);
    const beforeQty = healBefore?.quantity ?? 0;

    await mockApi.inventory.addToCharacter(MASTER_ID, {
      campaignId: CAMPAIGN_ID,
      characterId: 'char-lyra',
      itemId: ITEM_HEAL,
      quantity: 3,
    });

    const after = await mockApi.inventory.list(MASTER_ID, CAMPAIGN_ID);
    const healAfter = after.entries.find(
      (e) => e.characterId === 'char-lyra' && e.itemId === ITEM_HEAL,
    );
    expect(healAfter?.quantity).toBe(beforeQty + 3);
  });

  it('histórico registra cada movimentação', async () => {
    const beforeView = await mockApi.inventory.list(MASTER_ID, CAMPAIGN_ID);
    const before = beforeView.history.length;
    await mockApi.inventory.addToCharacter(MASTER_ID, {
      campaignId: CAMPAIGN_ID,
      characterId: 'char-lyra',
      itemId: ITEM_HEAL,
      quantity: 1,
      note: 'teste',
    });
    const afterView = await mockApi.inventory.list(MASTER_ID, CAMPAIGN_ID);
    expect(afterView.history.length).toBe(before + 1);
    expect(afterView.history[0].note).toBe('teste');
    expect(afterView.history[0].quantityDelta).toBe(1);
  });

  it('jogador não pode mexer em inventário de outro personagem', async () => {
    // Lyra é dona de char-lyra. Brann não pode adicionar lá.
    await expect(
      mockApi.inventory.addToCharacter('user-player-2', {
        campaignId: CAMPAIGN_ID,
        characterId: 'char-lyra',
        itemId: ITEM_HEAL,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('remover mais do que tem zera mas não fica negativo', async () => {
    const view = await mockApi.inventory.list(MASTER_ID, CAMPAIGN_ID);
    const entry = view.entries.find(
      (e) => e.characterId === 'char-lyra' && e.itemId === ITEM_HEAL,
    );
    expect(entry).toBeDefined();
    await mockApi.inventory.removeFromCharacter(PLAYER_1_ID, {
      entryId: entry!.id,
      quantity: 9999,
    });
    const after = await mockApi.inventory.list(MASTER_ID, CAMPAIGN_ID);
    const stillThere = after.entries.find(
      (e) => e.characterId === 'char-lyra' && e.itemId === ITEM_HEAL,
    );
    expect(stillThere).toBeUndefined();
  });
});
