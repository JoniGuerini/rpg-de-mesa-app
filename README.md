# Mesa — Hub de RPG de mesa online

> MVP (Fase 1) da plataforma web para RPG de mesa online: centraliza sessões, NPCs, timeline de eventos, notas, fichas de personagem e inventário em um único lugar, com regras estritas de visibilidade controladas pelo mestre.

Implementado em **React 18 + Vite + TypeScript (strict)**, com simulação de backend em `localStorage` para rodar end-to-end localmente, sem servidor real.

---

## Como rodar

Pré-requisitos: Node 18+ (testado em Node 22) e npm 10+.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # build de produção
npm run preview      # serve o build
npm run test         # roda os testes (Vitest)
npm run lint         # ESLint
npm run format       # Prettier write
```

### Login de demonstração

Na tela de login há atalhos para preencher rapidamente. Os usuários iniciais (seed) são:

| Papel    | E-mail              | Senha       |
| -------- | ------------------- | ----------- |
| Mestre   | `mestre@mesa.dev`   | `mestre123` |
| Jogadora | `lyra@mesa.dev`     | `jogador123` |
| Jogador  | `brann@mesa.dev`    | `jogador123` |

> Todos compartilham a campanha "Os Reinos do Vale Sombrio" do seed. A NPC **Vesper, a Encapuzada** é privada do mestre — entre como jogador e veja que ela não aparece. Volte como mestre e use **"Revelar para jogador"** para liberar para um jogador específico.

Para reiniciar os dados de exemplo a qualquer momento, use o botão de "atualizar" no canto superior direito (topbar).

---

## Stack

- **React 18** + **Vite 6** + **TypeScript** (strict, `noUnusedLocals`, `no-explicit-any: error`)
- **Tailwind CSS 3** + **shadcn/ui** (componentes Radix-based copiados localmente em `src/components/ui`)
- **React Router 6** (lazy routes por feature)
- **TanStack Query 5** (estado remoto + cache + invalidação)
- **React Hook Form** + **Zod** (formulários e validação)
- **Zustand** (sessão, usuário, tema, campanha ativa — todos persistidos em `localStorage`)
- **lucide-react**, **date-fns**, **nanoid**, **class-variance-authority**, **tailwind-merge**
- **Vitest 3** + **Testing Library** + **jsdom** (testes)
- **ESLint 9** + **Prettier** + **prettier-plugin-tailwindcss**

---

## Estrutura de pastas

```
src/
  app/                      # rotas, providers, layout principal
    AppLayout.tsx           # shell autenticado (sidebar + topbar)
    CampaignLayout.tsx      # layout das telas dentro de uma campanha
    NotFoundPage.tsx
    App.tsx                 # raiz: providers + router
    router.tsx              # createBrowserRouter com lazy routes
    layout/
      Sidebar.tsx
      Topbar.tsx
    providers/
      QueryProvider.tsx
  features/
    auth/                   # login, cadastro, ProtectedRoute
    campaigns/              # listagem, dashboard, formulário, membros
    sessions/               # listagem, detalhe, status, presença
    npcs/                   # CRUD + painel de visibilidade
    events/                 # CRUD + timeline
    notes/                  # CRUD + tags + busca
    inventory/              # itens por personagem + histórico
    characters/             # ficha + atributos + HP
  components/               # UI base (shadcn) e componentes reutilizáveis
    ui/
    EmptyState.tsx
    PageHeader.tsx
    ThemeToggle.tsx
  hooks/
    useToast.ts
  lib/
    mockApi.ts              # API simulada (todas as rotas)
    mockSeed.ts             # dados de exemplo
    mockStorage.ts          # localStorage com fallback em memória
    utils.ts                # cn(), sleep(), randomBetween()
  stores/
    authStore.ts            # zustand: sessão e usuário
    activeCampaignStore.ts  # campanha ativa
    themeStore.ts           # claro/escuro persistido
  styles/
    globals.css             # Tailwind base + variáveis HSL para shadcn
  test/
    setup.ts                # jest-dom + cleanup + clear localStorage
    helpers.tsx             # renderWithProviders
  types/
    index.ts                # tipos de domínio (Campaign, NPC, etc.)
```

Cada feature segue o mesmo formato:

```
features/<feature>/
  api.ts                    # hooks TanStack Query encapsulando o mockApi
  components/               # dialogs, painéis específicos
  hooks/                    # hooks de domínio (ex.: useCampaignRole)
  pages/                    # páginas roteadas
  api.test.ts               # testes de regras de negócio
```

---

## Decisões técnicas

### 1. Backend simulado fortemente tipado

`src/lib/mockApi.ts` expõe rotas (`auth`, `campaigns`, `sessions`, `npcs`, `events`, `notes`, `characters`, `inventory`) que **espelham a seção "API de alto nível" do documento**. Cada chamada:

- aceita `currentUserId` como argumento (token decodificado em `userIdFromToken`),
- valida pertencimento e papel,
- aplica regras de visibilidade **no servidor** antes de retornar,
- simula latência de 200–400 ms,
- persiste a "tabela" em `localStorage` (chave `mesa.mock-backend.v1`).

Optei por uma camada async puramente em JS em vez de MSW para reduzir overhead e facilitar testes diretos das regras de visibilidade. Substituir por uma API real é trivial: cada hook do React Query chama uma função do `mockApi` — basta trocar o corpo da função pela chamada `fetch` mantendo a mesma assinatura.

### 2. Regras de visibilidade aplicadas no backend

A UI **não** filtra dados sensíveis — o servidor (mock) faz isso. Exemplos cobertos por testes (`src/features/**/api.test.ts`):

- jogador recebe lista de NPCs filtrada por `revealedTo`;
- `npcs.get` retorna 403 se o NPC não foi revelado;
- jogador nunca recebe eventos com `visibility: 'private'`;
- eventos `restricted` só passam quando o `userId` está em `visibleTo`;
- notas `master` nunca chegam ao jogador;
- jogador não pode criar nota com visibilidade `master`;
- jogador não pode mexer no inventário de outro personagem.

Isso garante que mesmo se a UI tiver bug, dados sensíveis não vazam — exatamente como aconteceria num backend real.

### 3. Tipagem rigorosa

- `tsconfig` com `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- Regra ESLint `@typescript-eslint/no-explicit-any: error`.
- IDs com aliases nominais (`UserId`, `CampaignId` etc.) facilitando refatoração.
- Tipos extensíveis: campos como `metadata`, `tags`, `relatedNpcIds` ficam prontos para Fases 2–6.

### 4. Cache e mutations padronizados

Cada feature exporta hooks (`useXyzQuery`, `useCreate/Update/DeleteXyzMutation`) com chaves de cache consistentes (`['npcs', campaignId, userId]`) e invalidações granulares no `onSuccess`. As mutations sempre invalidam pelo menos a query da campanha ativa.

### 5. Formulários

Todos os formulários usam **React Hook Form + Zod** com `zodResolver`. Erros são exibidos sob cada campo com `aria-invalid`. Os formulários tratam dois modos (criar e editar) com o mesmo componente, resetando os defaults quando abrem.

### 6. UX e acessibilidade

- Layout estilo "hub": sidebar colapsável-friendly à esquerda, topbar com seletor de campanha + tema + usuário.
- Foco visível (`focus-visible:ring-2`) em toda a UI.
- Empty states ilustrados em todas as listas vazias.
- Toasts de feedback após mutações.
- Tema **claro e escuro** com toggle persistido (`themeStore`).
- Texto em português, datas com `date-fns/locale/ptBR`.

### 7. Testes

26 testes cobrindo regras de visibilidade críticas (NPCs, eventos, notas), CRUD de campanhas com permissões e mecânicas do inventário (empilhamento, histórico, clamp).

---

## Funcionalidades do MVP (Fase 1)

| Item | Onde | Status |
| --- | --- | --- |
| Autenticação simulada (login/cadastro) | `features/auth/pages/*` | ✅ |
| Rotas protegidas | `ProtectedRoute` | ✅ |
| Persistência de usuário em localStorage | `authStore` | ✅ |
| CRUD de campanhas | `features/campaigns` | ✅ |
| Convite de participantes (mestre/co-mestre/jogador/observador) | `MembersPanel` | ✅ |
| CRUD de sessões + iniciar/pausar/encerrar | `features/sessions` | ✅ |
| Registro de presença | `SessionDetailPage` | ✅ |
| CRUD de NPCs com `revealedTo` por jogador | `features/npcs` | ✅ |
| Botão "Revelar para jogador" funcional | `NpcVisibilityPanel` | ✅ |
| Timeline de eventos com público/privado/restrito | `features/events` | ✅ |
| Notas privadas do mestre / compartilhadas / pessoais | `features/notes` | ✅ |
| Tags + busca em notas | `features/notes` | ✅ |
| Inventário por personagem + histórico | `features/inventory` | ✅ |
| Ficha de personagem básica (HP, atributos, classe, equipamentos) | `features/characters` | ✅ |
| Resumo manual da sessão + botão "Gerar resumo (em breve)" | `SessionDetailPage` | ✅ |
| Dashboard da campanha com cards de resumo | `CampaignDashboardPage` | ✅ |
| Tema claro/escuro persistente | `ThemeToggle` | ✅ |

### Convenção de papéis

| Papel       | Permissões |
| ----------- | ---------- |
| `master`    | Tudo. Dono da campanha original também. |
| `co-master` | Mesmas permissões do mestre exceto excluir a campanha. |
| `player`    | Vê NPCs revelados a si, eventos públicos / restritos a si, notas compartilhadas. Edita os próprios personagens, inventários e notas pessoais. |
| `observer`  | Tratado como jogador para visibilidade. |

---

## Próximos passos (Fases 2–6 do roadmap)

A arquitetura por feature foi pensada para receber os próximos módulos sem refatoração:

- **Fase 2** — Locais, quests, monstros e relações entre entidades. Anexos. Permissões mais finas.
  - Adicionar `features/locations`, `features/quests`, `features/monsters` no mesmo formato (`api.ts` + `pages/` + `components/`).
  - Estender `MockDatabase` em `mockStorage.ts` e o `mockSeed.ts`.
- **Fase 3** — Grid tático, tokens, fog of war.
  - Nova feature `features/grid` com canvas/svg dedicado.
  - Novo store `useGridStore` para posicionamento em tempo real.
- **Fase 4** — IA real para resumo, extração de entidades, busca contextual.
  - O botão "Gerar resumo (em breve)" já está plumbado em `SessionDetailPage`. Substituir por chamada a uma rota AI Gateway / Vercel AI SDK.
- **Fase 5** — Tempo real, presença, chat.
  - Substituir o `mockApi` por endpoints reais com WebSocket/SSE; o React Query já está pronto para `useSubscription` ou `setQueryData`.
- **Fase 6** — Recursos premium: PDF/Markdown export, transcrição de áudio, múltiplas campanhas em escala.
  - O modelo já suporta múltiplas campanhas por usuário; falta apenas onboarding e billing.

---

## Limitações conhecidas (intencionais no MVP)

- Sem grid tático, sem combate automatizado, sem IA real, sem WebSocket.
- "Login" não tem real hashing de senha — o `fakeHash` em `mockSeed.ts` é apenas didático. Em produção, isso fica do lado do servidor.
- IDs de tokens não expiram.
- Não há upload de imagens — campos como `imageUrl` aceitam URLs externas.

Tudo isso é tratado nas fases seguintes.
