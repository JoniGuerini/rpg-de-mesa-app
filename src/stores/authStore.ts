import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: () => boolean;
  setSession: (session: AuthSession) => void;
  updateUser: (user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: () => Boolean(get().token && get().user),
      setSession: (session) => set({ user: session.user, token: session.token }),
      updateUser: (user) => set({ user }),
      clear: () => set({ user: null, token: null }),
    }),
    {
      name: 'mesa.auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
);
