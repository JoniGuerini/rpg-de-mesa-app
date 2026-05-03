import { createBrowserRouter, Navigate } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    lazy: async () => {
      const mod = await import('@/features/auth/pages/LoginPage');
      return { Component: mod.LoginPage };
    },
  },
  {
    path: '/cadastro',
    lazy: async () => {
      const mod = await import('@/features/auth/pages/RegisterPage');
      return { Component: mod.RegisterPage };
    },
  },
  {
    path: '/app',
    lazy: async () => {
      const mod = await import('@/app/AppLayout');
      return { Component: mod.AppLayout };
    },
    children: [
      { index: true, element: <Navigate to="/app/campanhas" replace /> },
      {
        path: 'campanhas',
        lazy: async () => {
          const mod = await import('@/features/campaigns/pages/CampaignListPage');
          return { Component: mod.CampaignListPage };
        },
      },
      {
        path: 'campanhas/:campaignId',
        lazy: async () => {
          const mod = await import('@/app/CampaignLayout');
          return { Component: mod.CampaignLayout };
        },
        children: [
          {
            index: true,
            lazy: async () => {
              const mod = await import('@/features/campaigns/pages/CampaignDashboardPage');
              return { Component: mod.CampaignDashboardPage };
            },
          },
          {
            path: 'sessoes',
            lazy: async () => {
              const mod = await import('@/features/sessions/pages/SessionListPage');
              return { Component: mod.SessionListPage };
            },
          },
          {
            path: 'sessoes/:sessionId',
            lazy: async () => {
              const mod = await import('@/features/sessions/pages/SessionDetailPage');
              return { Component: mod.SessionDetailPage };
            },
          },
          {
            path: 'npcs',
            lazy: async () => {
              const mod = await import('@/features/npcs/pages/NpcListPage');
              return { Component: mod.NpcListPage };
            },
          },
          {
            path: 'eventos',
            lazy: async () => {
              const mod = await import('@/features/events/pages/EventTimelinePage');
              return { Component: mod.EventTimelinePage };
            },
          },
          {
            path: 'notas',
            lazy: async () => {
              const mod = await import('@/features/notes/pages/NoteListPage');
              return { Component: mod.NoteListPage };
            },
          },
          {
            path: 'inventario',
            lazy: async () => {
              const mod = await import('@/features/inventory/pages/InventoryPage');
              return { Component: mod.InventoryPage };
            },
          },
          {
            path: 'personagens',
            lazy: async () => {
              const mod = await import('@/features/characters/pages/CharacterListPage');
              return { Component: mod.CharacterListPage };
            },
          },
          {
            path: 'personagens/:characterId',
            lazy: async () => {
              const mod = await import('@/features/characters/pages/CharacterDetailPage');
              return { Component: mod.CharacterDetailPage };
            },
          },
        ],
      },
    ],
  },
  {
    path: '*',
    lazy: async () => {
      const mod = await import('@/app/NotFoundPage');
      return { Component: mod.NotFoundPage };
    },
  },
]);
