import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">404</p>
      <h1 className="text-4xl font-bold tracking-tight">Página não encontrada</h1>
      <p className="max-w-md text-muted-foreground">
        O caminho que você tentou acessar não existe (ou ainda não foi mapeado nesta jornada).
      </p>
      <Button asChild>
        <Link to="/app">Voltar para o hub</Link>
      </Button>
    </div>
  );
}
