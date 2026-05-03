/**
 * Camada de persistência do mock backend.
 *
 * Centraliza acesso ao localStorage atrás de uma chave única para
 * simular um banco relacional simples. Em qualquer ambiente sem
 * `localStorage` (ex.: testes em jsdom puro) usa um fallback em memória.
 */

import type {
  Campaign,
  CampaignEvent,
  Character,
  GameSession,
  InventoryEntry,
  InventoryHistoryEntry,
  InventoryItem,
  NPC,
  Note,
  User,
  UserCredential,
} from '@/types';

const STORAGE_KEY = 'mesa.mock-backend.v1';

export interface MockDatabase {
  users: User[];
  credentials: UserCredential[];
  campaigns: Campaign[];
  sessions: GameSession[];
  npcs: NPC[];
  events: CampaignEvent[];
  notes: Note[];
  characters: Character[];
  items: InventoryItem[];
  inventory: InventoryEntry[];
  inventoryHistory: InventoryHistoryEntry[];
}

let memoryFallback: MockDatabase | null = null;

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readDatabase(): MockDatabase | null {
  if (hasLocalStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MockDatabase;
    } catch {
      return null;
    }
  }
  return memoryFallback;
}

export function writeDatabase(db: MockDatabase): void {
  if (hasLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return;
  }
  memoryFallback = db;
}

export function resetDatabase(): void {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  memoryFallback = null;
}
