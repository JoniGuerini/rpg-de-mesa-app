/**
 * Modelo de dados inicial — Plataforma de RPG de mesa online (MVP).
 *
 * Os tipos foram desenhados para serem extensíveis: campos como
 * `metadata`, `tags` e estruturas como `revealedTo` permitem futuras
 * fases (locais, quests, monstros, grid tático, IA) sem quebrar o MVP.
 */

export type ID = string;
export type ISODateString = string;

/* ---------------------- Usuários e papéis ---------------------- */

export type UserId = ID;

export interface User {
  id: UserId;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: ISODateString;
}

/** Credenciais simuladas — somente no mock backend, nunca expostas ao app. */
export interface UserCredential {
  userId: UserId;
  email: string;
  passwordHash: string;
}

export type CampaignRole = 'master' | 'co-master' | 'player' | 'observer';

export interface CampaignMember {
  userId: UserId;
  role: CampaignRole;
  joinedAt: ISODateString;
}

/* -------------------------- Campanha --------------------------- */

export type CampaignId = ID;

export type CampaignStatus = 'planning' | 'active' | 'paused' | 'finished';

export interface Campaign {
  id: CampaignId;
  name: string;
  description: string;
  system: string;
  language: string;
  status: CampaignStatus;
  ownerId: UserId;
  members: CampaignMember[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --------------------------- Sessão ---------------------------- */

export type SessionId = ID;

export type SessionStatus = 'scheduled' | 'in_progress' | 'paused' | 'finished';

export interface SessionAttendance {
  userId: UserId;
  present: boolean;
}

export interface GameSession {
  id: SessionId;
  campaignId: CampaignId;
  title: string;
  scheduledAt: ISODateString;
  startedAt?: ISODateString;
  endedAt?: ISODateString;
  status: SessionStatus;
  attendance: SessionAttendance[];
  /** Resumo escrito pelo mestre (publicado para os jogadores). */
  summary?: string;
  /** Indica se o resumo já foi publicado para os jogadores. */
  summaryPublished: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ----------------------------- NPCs ---------------------------- */

export type NpcId = ID;

export type NpcStatus = 'alive' | 'wounded' | 'dead' | 'unknown' | 'hostile' | 'ally';

export interface NPC {
  id: NpcId;
  campaignId: CampaignId;
  name: string;
  description: string;
  role?: string;
  faction?: string;
  imageUrl?: string;
  status: NpcStatus;
  /** Lista de IDs de jogadores que já descobriram o NPC. Mestre/co-mestre sempre veem. */
  revealedTo: UserId[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --------------------------- Eventos --------------------------- */

export type EventId = ID;

/**
 * - public: todos os participantes da campanha veem.
 * - private: apenas mestre / co-mestre.
 * - restricted: apenas usuários listados em `visibleTo`.
 */
export type EventVisibility = 'public' | 'private' | 'restricted';

export interface CampaignEvent {
  id: EventId;
  campaignId: CampaignId;
  sessionId?: SessionId;
  title: string;
  description: string;
  occurredAt: ISODateString;
  visibility: EventVisibility;
  visibleTo: UserId[];
  relatedNpcIds: NpcId[];
  createdAt: ISODateString;
}

/* ---------------------------- Notas ---------------------------- */

export type NoteId = ID;

/**
 * - master: nota privada do mestre (jogadores nunca veem).
 * - shared: visível para todos da campanha.
 * - personal: nota pessoal do autor (apenas o autor vê).
 */
export type NoteVisibility = 'master' | 'shared' | 'personal';

export interface Note {
  id: NoteId;
  campaignId: CampaignId;
  authorId: UserId;
  title: string;
  content: string;
  tags: string[];
  visibility: NoteVisibility;
  pinned: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ------------------------- Personagens ------------------------- */

export type CharacterId = ID;

export interface CharacterAttributes {
  forca: number;
  destreza: number;
  constituicao: number;
  inteligencia: number;
  sabedoria: number;
  carisma: number;
}

export interface Character {
  id: CharacterId;
  campaignId: CampaignId;
  ownerId: UserId;
  name: string;
  classe: string;
  level: number;
  hpCurrent: number;
  hpMax: number;
  attributes: CharacterAttributes;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ------------------------- Inventário -------------------------- */

export type ItemId = ID;
export type InventoryEntryId = ID;
export type InventoryHistoryId = ID;

export interface InventoryItem {
  id: ItemId;
  campaignId: CampaignId;
  name: string;
  description: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface InventoryEntry {
  id: InventoryEntryId;
  campaignId: CampaignId;
  characterId: CharacterId;
  itemId: ItemId;
  quantity: number;
  equipped: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type InventoryAction = 'added' | 'removed' | 'adjusted';

export interface InventoryHistoryEntry {
  id: InventoryHistoryId;
  campaignId: CampaignId;
  characterId: CharacterId;
  itemId: ItemId;
  action: InventoryAction;
  quantityDelta: number;
  resultingQuantity: number;
  performedBy: UserId;
  occurredAt: ISODateString;
  note?: string;
}

/* ---------------------- Sessão autenticada --------------------- */

export interface AuthSession {
  user: User;
  token: string;
}

/* ------------------------ View helpers ------------------------- */

export interface NpcWithVisibility extends NPC {
  isHidden?: boolean;
}
