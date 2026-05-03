/**
 * Mock backend — implementa todas as rotas da seção "API de alto nível"
 * do documento de produto.
 *
 * Princípios:
 * - Persistência em localStorage (com fallback em memória).
 * - Seed inicial idempotente.
 * - Latência simulada (200–400ms).
 * - Regras de visibilidade aplicadas AQUI (no backend), não na UI:
 *   • Mestre / co-mestre: vê tudo.
 *   • Jogador: só vê NPCs com seu id em `revealedTo`, eventos `public`
 *     ou `restricted` que o incluam, notas `master` nunca, notas
 *     `personal` apenas as próprias.
 *   • Observador: tratado como jogador para visibilidade.
 */

import { nanoid } from 'nanoid';
import { sleep, randomBetween } from '@/lib/utils';
import { readDatabase, writeDatabase, type MockDatabase } from '@/lib/mockStorage';
import { buildSeedDatabase, fakeHash } from '@/lib/mockSeed';
import type {
  AuthSession,
  Campaign,
  CampaignEvent,
  CampaignId,
  CampaignMember,
  CampaignRole,
  CampaignStatus,
  Character,
  CharacterAttributes,
  CharacterId,
  EventId,
  EventVisibility,
  GameSession,
  ID,
  InventoryEntry,
  InventoryHistoryEntry,
  InventoryItem,
  ItemId,
  NPC,
  NoteId,
  Note,
  NoteVisibility,
  NpcId,
  NpcStatus,
  SessionId,
  SessionStatus,
  User,
  UserId,
} from '@/types';

/* ----------------------- helpers internos ---------------------- */

function nowIso(): string {
  return new Date().toISOString();
}

async function simulateLatency(): Promise<void> {
  await sleep(randomBetween(200, 400));
}

function ensureDatabase(): MockDatabase {
  let db = readDatabase();
  if (!db) {
    db = buildSeedDatabase();
    writeDatabase(db);
  }
  return db;
}

function persist(db: MockDatabase): void {
  writeDatabase(db);
}

export class ApiError extends Error {
  public readonly status: number;
  public constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function findCampaignOrThrow(db: MockDatabase, campaignId: CampaignId): Campaign {
  const c = db.campaigns.find((x) => x.id === campaignId);
  if (!c) throw new ApiError('Campanha não encontrada', 404);
  return c;
}

function getMemberRole(campaign: Campaign, userId: UserId): CampaignRole | null {
  return campaign.members.find((m) => m.userId === userId)?.role ?? null;
}

function isMaster(role: CampaignRole | null): boolean {
  return role === 'master' || role === 'co-master';
}

function ensureMember(campaign: Campaign, userId: UserId): CampaignRole {
  const role = getMemberRole(campaign, userId);
  if (!role) throw new ApiError('Usuário não participa desta campanha', 403);
  return role;
}

function ensureMaster(campaign: Campaign, userId: UserId): void {
  const role = ensureMember(campaign, userId);
  if (!isMaster(role)) {
    throw new ApiError('Apenas o mestre ou co-mestre pode realizar esta ação', 403);
  }
}

/* ============================================================== */
/*                            AUTH                                 */
/* ============================================================== */

const TOKEN_PREFIX = 'mock-token::';

function tokenFor(userId: UserId): string {
  return `${TOKEN_PREFIX}${userId}::${nanoid(8)}`;
}

export function userIdFromToken(token: string | null | undefined): UserId | null {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
  const parts = token.slice(TOKEN_PREFIX.length).split('::');
  return parts[0] ?? null;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    await simulateLatency();
    const db = ensureDatabase();
    const cred = db.credentials.find((c) => c.email.toLowerCase() === email.toLowerCase());
    if (!cred || cred.passwordHash !== fakeHash(password)) {
      throw new ApiError('E-mail ou senha incorretos', 401);
    }
    const user = db.users.find((u) => u.id === cred.userId);
    if (!user) throw new ApiError('Usuário não encontrado', 404);
    return { user, token: tokenFor(user.id) };
  },

  async register(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthSession> {
    await simulateLatency();
    const db = ensureDatabase();
    const exists = db.credentials.some(
      (c) => c.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (exists) throw new ApiError('Já existe uma conta com esse e-mail', 409);

    const user: User = {
      id: `user-${nanoid(8)}`,
      name: input.name,
      email: input.email,
      createdAt: nowIso(),
    };
    db.users.push(user);
    db.credentials.push({
      userId: user.id,
      email: input.email,
      passwordHash: fakeHash(input.password),
    });
    persist(db);
    return { user, token: tokenFor(user.id) };
  },

  async getCurrentUser(token: string): Promise<User> {
    await simulateLatency();
    const db = ensureDatabase();
    const userId = userIdFromToken(token);
    if (!userId) throw new ApiError('Sessão inválida', 401);
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new ApiError('Usuário não encontrado', 404);
    return user;
  },

  async listUsers(): Promise<User[]> {
    await simulateLatency();
    const db = ensureDatabase();
    return db.users.map((u) => ({ ...u }));
  },
};

/* ============================================================== */
/*                          CAMPAIGNS                              */
/* ============================================================== */

export interface CampaignInput {
  name: string;
  description: string;
  system: string;
  language: string;
  status: CampaignStatus;
}

export const campaignsApi = {
  async list(currentUserId: UserId): Promise<Campaign[]> {
    await simulateLatency();
    const db = ensureDatabase();
    return db.campaigns
      .filter((c) => c.members.some((m) => m.userId === currentUserId))
      .map((c) => ({ ...c, members: [...c.members] }));
  },

  async get(currentUserId: UserId, id: CampaignId): Promise<Campaign> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, id);
    ensureMember(camp, currentUserId);
    return { ...camp, members: [...camp.members] };
  },

  async create(currentUserId: UserId, input: CampaignInput): Promise<Campaign> {
    await simulateLatency();
    const db = ensureDatabase();
    const ts = nowIso();
    const c: Campaign = {
      id: `camp-${nanoid(8)}`,
      ...input,
      ownerId: currentUserId,
      members: [{ userId: currentUserId, role: 'master', joinedAt: ts }],
      createdAt: ts,
      updatedAt: ts,
    };
    db.campaigns.push(c);
    persist(db);
    return { ...c, members: [...c.members] };
  },

  async update(
    currentUserId: UserId,
    id: CampaignId,
    patch: Partial<CampaignInput>,
  ): Promise<Campaign> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, id);
    ensureMaster(camp, currentUserId);
    Object.assign(camp, patch, { updatedAt: nowIso() });
    persist(db);
    return { ...camp, members: [...camp.members] };
  },

  async delete(currentUserId: UserId, id: CampaignId): Promise<void> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, id);
    if (camp.ownerId !== currentUserId) {
      throw new ApiError('Apenas o dono pode excluir a campanha', 403);
    }
    db.campaigns = db.campaigns.filter((c) => c.id !== id);
    db.sessions = db.sessions.filter((s) => s.campaignId !== id);
    db.npcs = db.npcs.filter((n) => n.campaignId !== id);
    db.events = db.events.filter((e) => e.campaignId !== id);
    db.notes = db.notes.filter((n) => n.campaignId !== id);
    db.characters = db.characters.filter((c) => c.campaignId !== id);
    db.items = db.items.filter((i) => i.campaignId !== id);
    db.inventory = db.inventory.filter((i) => i.campaignId !== id);
    db.inventoryHistory = db.inventoryHistory.filter((h) => h.campaignId !== id);
    persist(db);
  },

  async addMember(
    currentUserId: UserId,
    campaignId: CampaignId,
    userId: UserId,
    role: CampaignRole,
  ): Promise<CampaignMember> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMaster(camp, currentUserId);
    if (!db.users.some((u) => u.id === userId)) {
      throw new ApiError('Usuário não encontrado', 404);
    }
    if (camp.members.some((m) => m.userId === userId)) {
      throw new ApiError('Usuário já participa da campanha', 409);
    }
    const member: CampaignMember = { userId, role, joinedAt: nowIso() };
    camp.members.push(member);
    camp.updatedAt = nowIso();
    persist(db);
    return member;
  },

  async removeMember(
    currentUserId: UserId,
    campaignId: CampaignId,
    userId: UserId,
  ): Promise<void> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMaster(camp, currentUserId);
    if (camp.ownerId === userId) {
      throw new ApiError('Não é possível remover o dono da campanha', 400);
    }
    camp.members = camp.members.filter((m) => m.userId !== userId);
    camp.updatedAt = nowIso();
    persist(db);
  },

  async changeMemberRole(
    currentUserId: UserId,
    campaignId: CampaignId,
    userId: UserId,
    role: CampaignRole,
  ): Promise<CampaignMember> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMaster(camp, currentUserId);
    const member = camp.members.find((m) => m.userId === userId);
    if (!member) throw new ApiError('Membro não encontrado', 404);
    if (camp.ownerId === userId && role !== 'master') {
      throw new ApiError('O dono da campanha precisa permanecer como mestre', 400);
    }
    member.role = role;
    camp.updatedAt = nowIso();
    persist(db);
    return { ...member };
  },
};

/* ============================================================== */
/*                            SESSIONS                             */
/* ============================================================== */

export interface SessionInput {
  title: string;
  scheduledAt: string;
}

export const sessionsApi = {
  async list(currentUserId: UserId, campaignId: CampaignId): Promise<GameSession[]> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMember(camp, currentUserId);
    return db.sessions
      .filter((s) => s.campaignId === campaignId)
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .map((s) => ({ ...s, attendance: [...s.attendance] }));
  },

  async get(currentUserId: UserId, sessionId: SessionId): Promise<GameSession> {
    await simulateLatency();
    const db = ensureDatabase();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new ApiError('Sessão não encontrada', 404);
    const camp = findCampaignOrThrow(db, session.campaignId);
    ensureMember(camp, currentUserId);
    return { ...session, attendance: [...session.attendance] };
  },

  async create(
    currentUserId: UserId,
    campaignId: CampaignId,
    input: SessionInput,
  ): Promise<GameSession> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMaster(camp, currentUserId);
    const ts = nowIso();
    const session: GameSession = {
      id: `sess-${nanoid(8)}`,
      campaignId,
      title: input.title,
      scheduledAt: input.scheduledAt,
      status: 'scheduled',
      attendance: camp.members.map((m) => ({ userId: m.userId, present: false })),
      summaryPublished: false,
      createdAt: ts,
      updatedAt: ts,
    };
    db.sessions.push(session);
    persist(db);
    return { ...session, attendance: [...session.attendance] };
  },

  async update(
    currentUserId: UserId,
    sessionId: SessionId,
    patch: Partial<Pick<GameSession, 'title' | 'scheduledAt' | 'summary' | 'summaryPublished'>>,
  ): Promise<GameSession> {
    await simulateLatency();
    const db = ensureDatabase();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new ApiError('Sessão não encontrada', 404);
    const camp = findCampaignOrThrow(db, session.campaignId);
    ensureMaster(camp, currentUserId);
    Object.assign(session, patch, { updatedAt: nowIso() });
    persist(db);
    return { ...session, attendance: [...session.attendance] };
  },

  async setStatus(
    currentUserId: UserId,
    sessionId: SessionId,
    status: SessionStatus,
  ): Promise<GameSession> {
    await simulateLatency();
    const db = ensureDatabase();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new ApiError('Sessão não encontrada', 404);
    const camp = findCampaignOrThrow(db, session.campaignId);
    ensureMaster(camp, currentUserId);
    session.status = status;
    if (status === 'in_progress' && !session.startedAt) session.startedAt = nowIso();
    if (status === 'finished' && !session.endedAt) session.endedAt = nowIso();
    session.updatedAt = nowIso();
    persist(db);
    return { ...session, attendance: [...session.attendance] };
  },

  async setAttendance(
    currentUserId: UserId,
    sessionId: SessionId,
    userId: UserId,
    present: boolean,
  ): Promise<GameSession> {
    await simulateLatency();
    const db = ensureDatabase();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new ApiError('Sessão não encontrada', 404);
    const camp = findCampaignOrThrow(db, session.campaignId);
    ensureMaster(camp, currentUserId);
    let entry = session.attendance.find((a) => a.userId === userId);
    if (!entry) {
      entry = { userId, present };
      session.attendance.push(entry);
    } else {
      entry.present = present;
    }
    session.updatedAt = nowIso();
    persist(db);
    return { ...session, attendance: [...session.attendance] };
  },

  async delete(currentUserId: UserId, sessionId: SessionId): Promise<void> {
    await simulateLatency();
    const db = ensureDatabase();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new ApiError('Sessão não encontrada', 404);
    const camp = findCampaignOrThrow(db, session.campaignId);
    ensureMaster(camp, currentUserId);
    db.sessions = db.sessions.filter((s) => s.id !== sessionId);
    db.events = db.events.map((e) => (e.sessionId === sessionId ? { ...e, sessionId: undefined } : e));
    persist(db);
  },
};

/* ============================================================== */
/*                              NPCs                               */
/* ============================================================== */

export interface NpcInput {
  name: string;
  description: string;
  role?: string;
  faction?: string;
  status: NpcStatus;
  imageUrl?: string;
}

function isNpcVisibleTo(role: CampaignRole, npc: NPC, userId: UserId): boolean {
  if (isMaster(role)) return true;
  return npc.revealedTo.includes(userId);
}

export const npcsApi = {
  async list(currentUserId: UserId, campaignId: CampaignId): Promise<NPC[]> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    const role = ensureMember(camp, currentUserId);
    return db.npcs
      .filter((n) => n.campaignId === campaignId && isNpcVisibleTo(role, n, currentUserId))
      .map((n) => ({ ...n, revealedTo: [...n.revealedTo] }));
  },

  async get(currentUserId: UserId, npcId: NpcId): Promise<NPC> {
    await simulateLatency();
    const db = ensureDatabase();
    const npc = db.npcs.find((n) => n.id === npcId);
    if (!npc) throw new ApiError('NPC não encontrado', 404);
    const camp = findCampaignOrThrow(db, npc.campaignId);
    const role = ensureMember(camp, currentUserId);
    if (!isNpcVisibleTo(role, npc, currentUserId)) {
      throw new ApiError('NPC não revelado para você', 403);
    }
    return { ...npc, revealedTo: [...npc.revealedTo] };
  },

  async create(
    currentUserId: UserId,
    campaignId: CampaignId,
    input: NpcInput,
  ): Promise<NPC> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMaster(camp, currentUserId);
    const ts = nowIso();
    const npc: NPC = {
      id: `npc-${nanoid(8)}`,
      campaignId,
      name: input.name,
      description: input.description,
      role: input.role,
      faction: input.faction,
      imageUrl: input.imageUrl,
      status: input.status,
      revealedTo: [],
      createdAt: ts,
      updatedAt: ts,
    };
    db.npcs.push(npc);
    persist(db);
    return { ...npc, revealedTo: [...npc.revealedTo] };
  },

  async update(
    currentUserId: UserId,
    npcId: NpcId,
    patch: Partial<NpcInput>,
  ): Promise<NPC> {
    await simulateLatency();
    const db = ensureDatabase();
    const npc = db.npcs.find((n) => n.id === npcId);
    if (!npc) throw new ApiError('NPC não encontrado', 404);
    const camp = findCampaignOrThrow(db, npc.campaignId);
    ensureMaster(camp, currentUserId);
    Object.assign(npc, patch, { updatedAt: nowIso() });
    persist(db);
    return { ...npc, revealedTo: [...npc.revealedTo] };
  },

  async delete(currentUserId: UserId, npcId: NpcId): Promise<void> {
    await simulateLatency();
    const db = ensureDatabase();
    const npc = db.npcs.find((n) => n.id === npcId);
    if (!npc) throw new ApiError('NPC não encontrado', 404);
    const camp = findCampaignOrThrow(db, npc.campaignId);
    ensureMaster(camp, currentUserId);
    db.npcs = db.npcs.filter((n) => n.id !== npcId);
    db.events = db.events.map((e) => ({
      ...e,
      relatedNpcIds: e.relatedNpcIds.filter((rid) => rid !== npcId),
    }));
    persist(db);
  },

  async revealTo(currentUserId: UserId, npcId: NpcId, userId: UserId): Promise<NPC> {
    await simulateLatency();
    const db = ensureDatabase();
    const npc = db.npcs.find((n) => n.id === npcId);
    if (!npc) throw new ApiError('NPC não encontrado', 404);
    const camp = findCampaignOrThrow(db, npc.campaignId);
    ensureMaster(camp, currentUserId);
    if (!camp.members.some((m) => m.userId === userId)) {
      throw new ApiError('Usuário não pertence à campanha', 400);
    }
    if (!npc.revealedTo.includes(userId)) {
      npc.revealedTo.push(userId);
      npc.updatedAt = nowIso();
      persist(db);
    }
    return { ...npc, revealedTo: [...npc.revealedTo] };
  },

  async hideFrom(currentUserId: UserId, npcId: NpcId, userId: UserId): Promise<NPC> {
    await simulateLatency();
    const db = ensureDatabase();
    const npc = db.npcs.find((n) => n.id === npcId);
    if (!npc) throw new ApiError('NPC não encontrado', 404);
    const camp = findCampaignOrThrow(db, npc.campaignId);
    ensureMaster(camp, currentUserId);
    npc.revealedTo = npc.revealedTo.filter((id) => id !== userId);
    npc.updatedAt = nowIso();
    persist(db);
    return { ...npc, revealedTo: [...npc.revealedTo] };
  },
};

/* ============================================================== */
/*                            EVENTS                                */
/* ============================================================== */

export interface EventInput {
  title: string;
  description: string;
  occurredAt: string;
  visibility: EventVisibility;
  visibleTo?: UserId[];
  sessionId?: SessionId;
  relatedNpcIds?: NpcId[];
}

function isEventVisibleTo(role: CampaignRole, ev: CampaignEvent, userId: UserId): boolean {
  if (isMaster(role)) return true;
  if (ev.visibility === 'private') return false;
  if (ev.visibility === 'public') return true;
  return ev.visibleTo.includes(userId);
}

export const eventsApi = {
  async listByCampaign(
    currentUserId: UserId,
    campaignId: CampaignId,
  ): Promise<CampaignEvent[]> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    const role = ensureMember(camp, currentUserId);
    return db.events
      .filter((e) => e.campaignId === campaignId && isEventVisibleTo(role, e, currentUserId))
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .map((e) => ({
        ...e,
        visibleTo: [...e.visibleTo],
        relatedNpcIds: [...e.relatedNpcIds],
      }));
  },

  async listBySession(
    currentUserId: UserId,
    sessionId: SessionId,
  ): Promise<CampaignEvent[]> {
    await simulateLatency();
    const db = ensureDatabase();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new ApiError('Sessão não encontrada', 404);
    const camp = findCampaignOrThrow(db, session.campaignId);
    const role = ensureMember(camp, currentUserId);
    return db.events
      .filter((e) => e.sessionId === sessionId && isEventVisibleTo(role, e, currentUserId))
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .map((e) => ({
        ...e,
        visibleTo: [...e.visibleTo],
        relatedNpcIds: [...e.relatedNpcIds],
      }));
  },

  async create(
    currentUserId: UserId,
    campaignId: CampaignId,
    input: EventInput,
  ): Promise<CampaignEvent> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMaster(camp, currentUserId);
    const ts = nowIso();
    const ev: CampaignEvent = {
      id: `event-${nanoid(8)}`,
      campaignId,
      sessionId: input.sessionId,
      title: input.title,
      description: input.description,
      occurredAt: input.occurredAt,
      visibility: input.visibility,
      visibleTo: input.visibility === 'restricted' ? input.visibleTo ?? [] : [],
      relatedNpcIds: input.relatedNpcIds ?? [],
      createdAt: ts,
    };
    db.events.push(ev);
    persist(db);
    return { ...ev, visibleTo: [...ev.visibleTo], relatedNpcIds: [...ev.relatedNpcIds] };
  },

  async update(
    currentUserId: UserId,
    eventId: EventId,
    patch: Partial<EventInput>,
  ): Promise<CampaignEvent> {
    await simulateLatency();
    const db = ensureDatabase();
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev) throw new ApiError('Evento não encontrado', 404);
    const camp = findCampaignOrThrow(db, ev.campaignId);
    ensureMaster(camp, currentUserId);
    if (patch.title !== undefined) ev.title = patch.title;
    if (patch.description !== undefined) ev.description = patch.description;
    if (patch.occurredAt !== undefined) ev.occurredAt = patch.occurredAt;
    if (patch.sessionId !== undefined) ev.sessionId = patch.sessionId;
    if (patch.relatedNpcIds !== undefined) ev.relatedNpcIds = patch.relatedNpcIds;
    if (patch.visibility !== undefined) {
      ev.visibility = patch.visibility;
      if (patch.visibility !== 'restricted') ev.visibleTo = [];
    }
    if (patch.visibleTo !== undefined && ev.visibility === 'restricted') {
      ev.visibleTo = patch.visibleTo;
    }
    persist(db);
    return { ...ev, visibleTo: [...ev.visibleTo], relatedNpcIds: [...ev.relatedNpcIds] };
  },

  async delete(currentUserId: UserId, eventId: EventId): Promise<void> {
    await simulateLatency();
    const db = ensureDatabase();
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev) throw new ApiError('Evento não encontrado', 404);
    const camp = findCampaignOrThrow(db, ev.campaignId);
    ensureMaster(camp, currentUserId);
    db.events = db.events.filter((e) => e.id !== eventId);
    persist(db);
  },
};

/* ============================================================== */
/*                              NOTES                              */
/* ============================================================== */

export interface NoteInput {
  title: string;
  content: string;
  tags: string[];
  visibility: NoteVisibility;
  pinned?: boolean;
}

function isNoteVisibleTo(role: CampaignRole, note: Note, userId: UserId): boolean {
  if (note.visibility === 'master') return isMaster(role);
  if (note.visibility === 'shared') return true;
  return note.authorId === userId;
}

export const notesApi = {
  async list(
    currentUserId: UserId,
    campaignId: CampaignId,
    filters?: { search?: string; tag?: string },
  ): Promise<Note[]> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    const role = ensureMember(camp, currentUserId);

    const search = filters?.search?.toLowerCase().trim();
    const tag = filters?.tag?.toLowerCase().trim();

    return db.notes
      .filter((n) => n.campaignId === campaignId && isNoteVisibleTo(role, n, currentUserId))
      .filter((n) => {
        if (!search) return true;
        return (
          n.title.toLowerCase().includes(search) ||
          n.content.toLowerCase().includes(search) ||
          n.tags.some((t) => t.toLowerCase().includes(search))
        );
      })
      .filter((n) => {
        if (!tag) return true;
        return n.tags.some((t) => t.toLowerCase() === tag);
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      })
      .map((n) => ({ ...n, tags: [...n.tags] }));
  },

  async create(
    currentUserId: UserId,
    campaignId: CampaignId,
    input: NoteInput,
  ): Promise<Note> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    const role = ensureMember(camp, currentUserId);
    if (input.visibility === 'master' && !isMaster(role)) {
      throw new ApiError('Apenas mestre/co-mestre cria notas privadas do mestre', 403);
    }
    const ts = nowIso();
    const note: Note = {
      id: `note-${nanoid(8)}`,
      campaignId,
      authorId: currentUserId,
      title: input.title,
      content: input.content,
      tags: [...input.tags],
      visibility: input.visibility,
      pinned: input.pinned ?? false,
      createdAt: ts,
      updatedAt: ts,
    };
    db.notes.push(note);
    persist(db);
    return { ...note, tags: [...note.tags] };
  },

  async update(
    currentUserId: UserId,
    noteId: NoteId,
    patch: Partial<NoteInput>,
  ): Promise<Note> {
    await simulateLatency();
    const db = ensureDatabase();
    const note = db.notes.find((n) => n.id === noteId);
    if (!note) throw new ApiError('Nota não encontrada', 404);
    const camp = findCampaignOrThrow(db, note.campaignId);
    const role = ensureMember(camp, currentUserId);
    const isAuthor = note.authorId === currentUserId;
    if (!isAuthor && !isMaster(role)) {
      throw new ApiError('Você não pode editar esta nota', 403);
    }
    if (patch.visibility === 'master' && !isMaster(role)) {
      throw new ApiError('Apenas mestre/co-mestre marca nota como privada do mestre', 403);
    }
    if (patch.title !== undefined) note.title = patch.title;
    if (patch.content !== undefined) note.content = patch.content;
    if (patch.tags !== undefined) note.tags = [...patch.tags];
    if (patch.visibility !== undefined) note.visibility = patch.visibility;
    if (patch.pinned !== undefined) note.pinned = patch.pinned;
    note.updatedAt = nowIso();
    persist(db);
    return { ...note, tags: [...note.tags] };
  },

  async delete(currentUserId: UserId, noteId: NoteId): Promise<void> {
    await simulateLatency();
    const db = ensureDatabase();
    const note = db.notes.find((n) => n.id === noteId);
    if (!note) throw new ApiError('Nota não encontrada', 404);
    const camp = findCampaignOrThrow(db, note.campaignId);
    const role = ensureMember(camp, currentUserId);
    if (note.authorId !== currentUserId && !isMaster(role)) {
      throw new ApiError('Você não pode excluir esta nota', 403);
    }
    db.notes = db.notes.filter((n) => n.id !== noteId);
    persist(db);
  },
};

/* ============================================================== */
/*                          CHARACTERS                              */
/* ============================================================== */

export interface CharacterInput {
  name: string;
  classe: string;
  level: number;
  hpCurrent: number;
  hpMax: number;
  attributes: CharacterAttributes;
  notes?: string;
  ownerId: UserId;
}

export const charactersApi = {
  async list(currentUserId: UserId, campaignId: CampaignId): Promise<Character[]> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMember(camp, currentUserId);
    return db.characters
      .filter((c) => c.campaignId === campaignId)
      .map((c) => ({ ...c, attributes: { ...c.attributes } }));
  },

  async get(currentUserId: UserId, characterId: CharacterId): Promise<Character> {
    await simulateLatency();
    const db = ensureDatabase();
    const character = db.characters.find((c) => c.id === characterId);
    if (!character) throw new ApiError('Personagem não encontrado', 404);
    const camp = findCampaignOrThrow(db, character.campaignId);
    ensureMember(camp, currentUserId);
    return { ...character, attributes: { ...character.attributes } };
  },

  async create(
    currentUserId: UserId,
    campaignId: CampaignId,
    input: CharacterInput,
  ): Promise<Character> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    const role = ensureMember(camp, currentUserId);
    if (input.ownerId !== currentUserId && !isMaster(role)) {
      throw new ApiError('Você só pode criar personagens para você mesmo', 403);
    }
    const ts = nowIso();
    const character: Character = {
      id: `char-${nanoid(8)}`,
      campaignId,
      ownerId: input.ownerId,
      name: input.name,
      classe: input.classe,
      level: input.level,
      hpCurrent: input.hpCurrent,
      hpMax: input.hpMax,
      attributes: { ...input.attributes },
      notes: input.notes,
      createdAt: ts,
      updatedAt: ts,
    };
    db.characters.push(character);
    persist(db);
    return { ...character, attributes: { ...character.attributes } };
  },

  async update(
    currentUserId: UserId,
    characterId: CharacterId,
    patch: Partial<Omit<CharacterInput, 'ownerId'>>,
  ): Promise<Character> {
    await simulateLatency();
    const db = ensureDatabase();
    const character = db.characters.find((c) => c.id === characterId);
    if (!character) throw new ApiError('Personagem não encontrado', 404);
    const camp = findCampaignOrThrow(db, character.campaignId);
    const role = ensureMember(camp, currentUserId);
    if (character.ownerId !== currentUserId && !isMaster(role)) {
      throw new ApiError('Você não pode editar este personagem', 403);
    }
    if (patch.name !== undefined) character.name = patch.name;
    if (patch.classe !== undefined) character.classe = patch.classe;
    if (patch.level !== undefined) character.level = patch.level;
    if (patch.hpCurrent !== undefined) character.hpCurrent = patch.hpCurrent;
    if (patch.hpMax !== undefined) character.hpMax = patch.hpMax;
    if (patch.attributes !== undefined) character.attributes = { ...patch.attributes };
    if (patch.notes !== undefined) character.notes = patch.notes;
    character.updatedAt = nowIso();
    persist(db);
    return { ...character, attributes: { ...character.attributes } };
  },

  async delete(currentUserId: UserId, characterId: CharacterId): Promise<void> {
    await simulateLatency();
    const db = ensureDatabase();
    const character = db.characters.find((c) => c.id === characterId);
    if (!character) throw new ApiError('Personagem não encontrado', 404);
    const camp = findCampaignOrThrow(db, character.campaignId);
    const role = ensureMember(camp, currentUserId);
    if (character.ownerId !== currentUserId && !isMaster(role)) {
      throw new ApiError('Você não pode excluir este personagem', 403);
    }
    db.characters = db.characters.filter((c) => c.id !== characterId);
    db.inventory = db.inventory.filter((i) => i.characterId !== characterId);
    db.inventoryHistory = db.inventoryHistory.filter((h) => h.characterId !== characterId);
    persist(db);
  },
};

/* ============================================================== */
/*                            INVENTORY                             */
/* ============================================================== */

export interface ItemInput {
  name: string;
  description: string;
  rarity?: InventoryItem['rarity'];
}

export interface InventoryView {
  entries: InventoryEntry[];
  items: InventoryItem[];
  history: InventoryHistoryEntry[];
}

export const inventoryApi = {
  async list(currentUserId: UserId, campaignId: CampaignId): Promise<InventoryView> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMember(camp, currentUserId);
    return {
      entries: db.inventory.filter((i) => i.campaignId === campaignId).map((i) => ({ ...i })),
      items: db.items.filter((i) => i.campaignId === campaignId).map((i) => ({ ...i })),
      history: db.inventoryHistory
        .filter((h) => h.campaignId === campaignId)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .map((h) => ({ ...h })),
    };
  },

  async createItem(
    currentUserId: UserId,
    campaignId: CampaignId,
    input: ItemInput,
  ): Promise<InventoryItem> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, campaignId);
    ensureMaster(camp, currentUserId);
    const item: InventoryItem = { id: `item-${nanoid(8)}`, campaignId, ...input };
    db.items.push(item);
    persist(db);
    return { ...item };
  },

  async addToCharacter(
    currentUserId: UserId,
    args: {
      campaignId: CampaignId;
      characterId: CharacterId;
      itemId: ItemId;
      quantity: number;
      note?: string;
    },
  ): Promise<InventoryEntry> {
    await simulateLatency();
    const db = ensureDatabase();
    const camp = findCampaignOrThrow(db, args.campaignId);
    const role = ensureMember(camp, currentUserId);
    const character = db.characters.find((c) => c.id === args.characterId);
    if (!character) throw new ApiError('Personagem não encontrado', 404);
    if (character.ownerId !== currentUserId && !isMaster(role)) {
      throw new ApiError('Sem permissão para alterar este inventário', 403);
    }
    if (!db.items.some((i) => i.id === args.itemId)) {
      throw new ApiError('Item não encontrado', 404);
    }
    if (args.quantity <= 0) throw new ApiError('Quantidade deve ser positiva', 400);

    const ts = nowIso();
    let entry = db.inventory.find(
      (i) => i.characterId === args.characterId && i.itemId === args.itemId,
    );
    if (!entry) {
      entry = {
        id: `inv-${nanoid(8)}`,
        campaignId: args.campaignId,
        characterId: args.characterId,
        itemId: args.itemId,
        quantity: args.quantity,
        equipped: false,
        createdAt: ts,
        updatedAt: ts,
      };
      db.inventory.push(entry);
    } else {
      entry.quantity += args.quantity;
      entry.updatedAt = ts;
    }
    db.inventoryHistory.push({
      id: `inv-h-${nanoid(8)}`,
      campaignId: args.campaignId,
      characterId: args.characterId,
      itemId: args.itemId,
      action: 'added',
      quantityDelta: args.quantity,
      resultingQuantity: entry.quantity,
      performedBy: currentUserId,
      occurredAt: ts,
      note: args.note,
    });
    persist(db);
    return { ...entry };
  },

  async removeFromCharacter(
    currentUserId: UserId,
    args: {
      entryId: ID;
      quantity: number;
      note?: string;
    },
  ): Promise<InventoryEntry | null> {
    await simulateLatency();
    const db = ensureDatabase();
    const entry = db.inventory.find((i) => i.id === args.entryId);
    if (!entry) throw new ApiError('Entrada de inventário não encontrada', 404);
    const camp = findCampaignOrThrow(db, entry.campaignId);
    const role = ensureMember(camp, currentUserId);
    const character = db.characters.find((c) => c.id === entry.characterId);
    if (!character) throw new ApiError('Personagem não encontrado', 404);
    if (character.ownerId !== currentUserId && !isMaster(role)) {
      throw new ApiError('Sem permissão para alterar este inventário', 403);
    }
    if (args.quantity <= 0) throw new ApiError('Quantidade deve ser positiva', 400);

    const ts = nowIso();
    const removed = Math.min(args.quantity, entry.quantity);
    entry.quantity -= removed;
    entry.updatedAt = ts;

    db.inventoryHistory.push({
      id: `inv-h-${nanoid(8)}`,
      campaignId: entry.campaignId,
      characterId: entry.characterId,
      itemId: entry.itemId,
      action: 'removed',
      quantityDelta: -removed,
      resultingQuantity: entry.quantity,
      performedBy: currentUserId,
      occurredAt: ts,
      note: args.note,
    });

    if (entry.quantity === 0) {
      db.inventory = db.inventory.filter((i) => i.id !== entry.id);
      persist(db);
      return null;
    }
    persist(db);
    return { ...entry };
  },

  async toggleEquipped(currentUserId: UserId, entryId: ID): Promise<InventoryEntry> {
    await simulateLatency();
    const db = ensureDatabase();
    const entry = db.inventory.find((i) => i.id === entryId);
    if (!entry) throw new ApiError('Entrada de inventário não encontrada', 404);
    const camp = findCampaignOrThrow(db, entry.campaignId);
    const role = ensureMember(camp, currentUserId);
    const character = db.characters.find((c) => c.id === entry.characterId);
    if (!character) throw new ApiError('Personagem não encontrado', 404);
    if (character.ownerId !== currentUserId && !isMaster(role)) {
      throw new ApiError('Sem permissão para alterar este inventário', 403);
    }
    entry.equipped = !entry.equipped;
    entry.updatedAt = nowIso();
    persist(db);
    return { ...entry };
  },
};

/* ============================================================== */
/*                       Conveniência geral                         */
/* ============================================================== */

export const mockApi = {
  auth: authApi,
  campaigns: campaignsApi,
  sessions: sessionsApi,
  npcs: npcsApi,
  events: eventsApi,
  notes: notesApi,
  characters: charactersApi,
  inventory: inventoryApi,

  /** Reinicia o banco para o estado inicial (útil em desenvolvimento). */
  resetToSeed(): void {
    writeDatabase(buildSeedDatabase());
  },
};
