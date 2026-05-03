import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/mockApi';
import { useAuthStore } from '@/stores/authStore';
import type { AuthSession } from '@/types';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export function useLoginMutation() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ email, password }: LoginInput): Promise<AuthSession> =>
      authApi.login(email, password),
    onSuccess: (session) => setSession(session),
  });
}

export function useRegisterMutation() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: RegisterInput): Promise<AuthSession> => authApi.register(input),
    onSuccess: (session) => setSession(session),
  });
}
