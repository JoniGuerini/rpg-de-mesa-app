import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, LogIn, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginMutation } from '@/features/auth/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/hooks/useToast';
import { ApiError } from '@/lib/mockApi';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const login = useLoginMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      toast({ title: 'Bem-vindo de volta!', description: 'Sessão iniciada com sucesso.' });
      navigate('/app', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao entrar';
      toast({ title: 'Falha no login', description: message, variant: 'destructive' });
    }
  });

  const fillDemo = (email: string, password: string) => {
    form.setValue('email', email);
    form.setValue('password', password);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary/30 via-background to-background p-10 lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          Mesa
        </div>
        <div className="space-y-4 text-balance">
          <h1 className="text-4xl font-semibold tracking-tight">
            O hub da sua campanha de RPG.
          </h1>
          <p className="max-w-md text-muted-foreground">
            Centralize sessões, NPCs, timeline, notas, fichas e inventário em um único lugar —
            com controle total de visibilidade para o mestre.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          MVP — Fase 1 do roadmap. Backend simulado em localStorage.
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Acesse o hub da sua campanha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  {...form.register('email')}
                  aria-invalid={Boolean(form.formState.errors.email)}
                />
                {form.formState.errors.email ? (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                  aria-invalid={Boolean(form.formState.errors.password)}
                />
                {form.formState.errors.password ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? (
                  <>
                    <Loader2 className="animate-spin" /> Entrando…
                  </>
                ) : (
                  <>
                    <LogIn /> Entrar
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contas de demonstração
              </p>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-between"
                  onClick={() => fillDemo('mestre@mesa.dev', 'mestre123')}
                >
                  <span>Mestre Aelar (mestre)</span>
                  <span className="text-xs text-muted-foreground">mestre123</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-between"
                  onClick={() => fillDemo('lyra@mesa.dev', 'jogador123')}
                >
                  <span>Lyra (jogadora)</span>
                  <span className="text-xs text-muted-foreground">jogador123</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-between"
                  onClick={() => fillDemo('brann@mesa.dev', 'jogador123')}
                >
                  <span>Brann (jogador)</span>
                  <span className="text-xs text-muted-foreground">jogador123</span>
                </Button>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Ainda não tem conta?{' '}
              <Link to="/cadastro" className="font-medium text-primary hover:underline">
                Cadastre-se
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
