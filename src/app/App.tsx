import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { router } from '@/app/router';
import { Toaster } from '@/components/ui/toaster';

export function App(): JSX.Element {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
    </QueryProvider>
  );
}
