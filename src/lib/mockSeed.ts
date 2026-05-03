import type { MockDatabase } from '@/lib/mockStorage';

/**
 * Hash simulado para senhas (NÃO use em produção — apenas mock).
 * Garante que o seed seja determinístico mas evita guardar texto puro.
 */
export function fakeHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return `mock_${h.toString(16)}`;
}

const now = new Date('2026-04-12T20:00:00.000Z').toISOString();
const earlier = new Date('2026-04-05T20:00:00.000Z').toISOString();

export function buildSeedDatabase(): MockDatabase {
  return {
    users: [
      {
        id: 'user-master',
        name: 'Mestre Aelar',
        email: 'mestre@mesa.dev',
        createdAt: earlier,
      },
      {
        id: 'user-player-1',
        name: 'Lyra Sombravale',
        email: 'lyra@mesa.dev',
        createdAt: earlier,
      },
      {
        id: 'user-player-2',
        name: 'Brann Pedraviva',
        email: 'brann@mesa.dev',
        createdAt: earlier,
      },
    ],
    credentials: [
      {
        userId: 'user-master',
        email: 'mestre@mesa.dev',
        passwordHash: fakeHash('mestre123'),
      },
      {
        userId: 'user-player-1',
        email: 'lyra@mesa.dev',
        passwordHash: fakeHash('jogador123'),
      },
      {
        userId: 'user-player-2',
        email: 'brann@mesa.dev',
        passwordHash: fakeHash('jogador123'),
      },
    ],
    campaigns: [
      {
        id: 'camp-vale-sombrio',
        name: 'Os Reinos do Vale Sombrio',
        description:
          'Uma campanha de fantasia sombria onde antigos pactos despertam após séculos. Os heróis precisam decidir entre restaurar a velha ordem ou forjar uma nova era.',
        system: 'D&D 5e',
        language: 'pt-BR',
        status: 'active',
        ownerId: 'user-master',
        members: [
          { userId: 'user-master', role: 'master', joinedAt: earlier },
          { userId: 'user-player-1', role: 'player', joinedAt: earlier },
          { userId: 'user-player-2', role: 'player', joinedAt: earlier },
        ],
        createdAt: earlier,
        updatedAt: now,
      },
    ],
    sessions: [
      {
        id: 'sess-01',
        campaignId: 'camp-vale-sombrio',
        title: 'Sessão 1 — A Carta do Velho Marn',
        scheduledAt: earlier,
        startedAt: earlier,
        endedAt: new Date('2026-04-05T23:30:00.000Z').toISOString(),
        status: 'finished',
        attendance: [
          { userId: 'user-master', present: true },
          { userId: 'user-player-1', present: true },
          { userId: 'user-player-2', present: true },
        ],
        summary:
          'O grupo recebeu uma carta misteriosa do velho Marn. Após investigar a Estalagem do Carvalho Torto, descobriram um símbolo da Ordem da Lua Negra gravado sob a mesa. Brann interrogou a estalajadeira e Lyra encontrou um pergaminho parcial.',
        summaryPublished: true,
        createdAt: earlier,
        updatedAt: earlier,
      },
      {
        id: 'sess-02',
        campaignId: 'camp-vale-sombrio',
        title: 'Sessão 2 — Trilhas do Bosque Velado',
        scheduledAt: now,
        status: 'scheduled',
        attendance: [
          { userId: 'user-master', present: false },
          { userId: 'user-player-1', present: false },
          { userId: 'user-player-2', present: false },
        ],
        summaryPublished: false,
        createdAt: earlier,
        updatedAt: earlier,
      },
    ],
    npcs: [
      {
        id: 'npc-marn',
        campaignId: 'camp-vale-sombrio',
        name: 'Velho Marn',
        description:
          'Estudioso recluso, perdeu uma das mãos numa expedição ao Vale Sombrio. Conhece os antigos selos.',
        role: 'Mentor',
        faction: 'Ordem do Crepúsculo',
        status: 'ally',
        revealedTo: ['user-player-1', 'user-player-2'],
        createdAt: earlier,
        updatedAt: earlier,
      },
      {
        id: 'npc-vesper',
        campaignId: 'camp-vale-sombrio',
        name: 'Vesper, a Encapuzada',
        description:
          'Líder secreta da Ordem da Lua Negra. Movimenta agentes nas sombras e tem interesse no que Marn descobriu.',
        role: 'Antagonista',
        faction: 'Ordem da Lua Negra',
        status: 'hostile',
        revealedTo: [],
        createdAt: earlier,
        updatedAt: earlier,
      },
    ],
    events: [
      {
        id: 'event-01',
        campaignId: 'camp-vale-sombrio',
        sessionId: 'sess-01',
        title: 'Carta entregue na estalagem',
        description: 'Um mensageiro encapuzado deixa uma carta selada para o grupo.',
        occurredAt: new Date('2026-04-05T20:30:00.000Z').toISOString(),
        visibility: 'public',
        visibleTo: [],
        relatedNpcIds: ['npc-marn'],
        createdAt: earlier,
      },
      {
        id: 'event-02',
        campaignId: 'camp-vale-sombrio',
        sessionId: 'sess-01',
        title: 'Símbolo da Lua Negra encontrado',
        description: 'Lyra descobre um símbolo gravado sob a mesa do canto da estalagem.',
        occurredAt: new Date('2026-04-05T21:15:00.000Z').toISOString(),
        visibility: 'public',
        visibleTo: [],
        relatedNpcIds: [],
        createdAt: earlier,
      },
      {
        id: 'event-03',
        campaignId: 'camp-vale-sombrio',
        sessionId: 'sess-01',
        title: 'Vesper observa o grupo à distância',
        description:
          'Anotação privada do mestre: Vesper acompanhou o grupo desde a chegada. Ainda não foi notada.',
        occurredAt: new Date('2026-04-05T22:40:00.000Z').toISOString(),
        visibility: 'private',
        visibleTo: [],
        relatedNpcIds: ['npc-vesper'],
        createdAt: earlier,
      },
    ],
    notes: [
      {
        id: 'note-01',
        campaignId: 'camp-vale-sombrio',
        authorId: 'user-master',
        title: 'Plot — Pacto da Lua',
        content:
          'A Ordem da Lua Negra tenta romper o pacto de selamento. O grupo é peça chave sem saber.',
        tags: ['plot', 'spoiler'],
        visibility: 'master',
        pinned: true,
        createdAt: earlier,
        updatedAt: earlier,
      },
      {
        id: 'note-02',
        campaignId: 'camp-vale-sombrio',
        authorId: 'user-master',
        title: 'Bem-vindos ao Vale',
        content:
          'Recapitulando: vocês estão na vila de Carvalhal e foram contratados por um estranho de capuz.',
        tags: ['recap'],
        visibility: 'shared',
        pinned: true,
        createdAt: earlier,
        updatedAt: earlier,
      },
    ],
    characters: [
      {
        id: 'char-lyra',
        campaignId: 'camp-vale-sombrio',
        ownerId: 'user-player-1',
        name: 'Lyra Sombravale',
        classe: 'Ladina',
        level: 3,
        hpCurrent: 18,
        hpMax: 22,
        attributes: {
          forca: 10,
          destreza: 16,
          constituicao: 12,
          inteligencia: 13,
          sabedoria: 11,
          carisma: 14,
        },
        notes: 'Procurando o irmão desaparecido há cinco invernos.',
        createdAt: earlier,
        updatedAt: earlier,
      },
      {
        id: 'char-brann',
        campaignId: 'camp-vale-sombrio',
        ownerId: 'user-player-2',
        name: 'Brann Pedraviva',
        classe: 'Guerreiro',
        level: 3,
        hpCurrent: 28,
        hpMax: 30,
        attributes: {
          forca: 16,
          destreza: 12,
          constituicao: 15,
          inteligencia: 9,
          sabedoria: 11,
          carisma: 8,
        },
        notes: 'Veterano da guerra dos picos do norte.',
        createdAt: earlier,
        updatedAt: earlier,
      },
    ],
    items: [
      {
        id: 'item-poção-cura',
        campaignId: 'camp-vale-sombrio',
        name: 'Poção de Cura',
        description: 'Recupera 2d4+2 PV.',
        rarity: 'common',
      },
      {
        id: 'item-adaga-prata',
        campaignId: 'camp-vale-sombrio',
        name: 'Adaga de Prata',
        description: 'Eficaz contra criaturas vulneráveis a prata.',
        rarity: 'uncommon',
      },
      {
        id: 'item-pergaminho',
        campaignId: 'camp-vale-sombrio',
        name: 'Pergaminho Parcial',
        description: 'Texto antigo em meia-élfico, queimado nas bordas.',
        rarity: 'rare',
      },
    ],
    inventory: [
      {
        id: 'inv-01',
        campaignId: 'camp-vale-sombrio',
        characterId: 'char-lyra',
        itemId: 'item-poção-cura',
        quantity: 2,
        equipped: false,
        createdAt: earlier,
        updatedAt: earlier,
      },
      {
        id: 'inv-02',
        campaignId: 'camp-vale-sombrio',
        characterId: 'char-lyra',
        itemId: 'item-adaga-prata',
        quantity: 1,
        equipped: true,
        createdAt: earlier,
        updatedAt: earlier,
      },
      {
        id: 'inv-03',
        campaignId: 'camp-vale-sombrio',
        characterId: 'char-lyra',
        itemId: 'item-pergaminho',
        quantity: 1,
        equipped: false,
        createdAt: earlier,
        updatedAt: earlier,
      },
      {
        id: 'inv-04',
        campaignId: 'camp-vale-sombrio',
        characterId: 'char-brann',
        itemId: 'item-poção-cura',
        quantity: 1,
        equipped: false,
        createdAt: earlier,
        updatedAt: earlier,
      },
    ],
    inventoryHistory: [
      {
        id: 'inv-h-01',
        campaignId: 'camp-vale-sombrio',
        characterId: 'char-lyra',
        itemId: 'item-pergaminho',
        action: 'added',
        quantityDelta: 1,
        resultingQuantity: 1,
        performedBy: 'user-master',
        occurredAt: earlier,
        note: 'Encontrado sob a mesa da estalagem.',
      },
    ],
  };
}
