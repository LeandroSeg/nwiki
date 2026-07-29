# nwiki — Contexto de Memória

# NWIKI

NWIKI é uma aplicação que imita o Dokuwiki, um excelente editor de wiki hospedável que não usa banco de dados.  O NWIKI está em GPL-3.0.

# Teste local

- baixe o projeto do github
- npm run dev

# Produção nuvem

- vide deploy-ubuntu.md no root deste repo

# Demo url

https://www.kratomsoftware.com.br/wiki

# Projeto

## Visão Geral

nwiki é um clone do DokuWiki construído com Express + TypeScript (backend) e Vite + React + shadcn/ui (frontend). Persistência em arquivos `.txt`, sem banco de dados relacional.

## Stack

- **Backend:** Express 5 + TypeScript + Zod + JWT + bcrypt + Helmet + MiniSearch + Winston
- **Frontend:** Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + react-router-dom v7 + DOMPurify
- **Processos:** PM2 (produção), concurrently (dev)
- **Testes:** Vitest + supertest (105 testes, 10 arquivos)
- **URL base:** `/wiki/` — configurado em Vite (`base`), React Router (`basename`), nginx (`location /wiki/`)
- **Express direto:** middleware de rewrite (`/wiki/*` → `/*`) no `index.ts` para acesso sem nginx/Vite

## Endpoints principais

| Rota | Descrição |
|---|---|
| `POST /api/auth/login` | Login com JWT |
| `POST /api/auth/setup` | Primeiro admin |
| `GET/POST/PUT/DELETE /api/pages/*` | CRUD de páginas `.txt` |
| `GET /api/render/*id` | Renderiza DokuWiki → HTML |
| `POST /api/render` | Renderiza markup arbitrário (preview editor) |
| `GET/POST/DELETE /api/media/*` | Gerenciamento de mídia |
| `GET /api/search?q=` | Full-text search c/ MiniSearch |
| `GET/PUT /api/admin/config` | Config global |
| `GET/PUT /api/admin/groups` | CRUD de grupos |
| `GET/PUT /api/admin/users/**` | Gerenciamento de usuários |

## Arquivos importantes

- `server/src/routes/` — todas as rotas da API
- `server/src/lib/` — utilitários (fileHandler, users, groups, pageAccess, config, searchIndex)
- `client/src/pages/` — componentes de página React
- `client/src/context/` — AuthContext, ThemeContext, LanguageContext
- `client/src/i18n/translations.ts` — traduções pt/en
- `client/src/components/FormatToolbar.tsx` — barra de formatação com suporte horizontal/vertical
- `client/src/components/PreviewDialog.tsx` — modal de pré-visualização
- `client/src/components/MediaPickerModal.tsx` — seletor de mídia inline
- `client/src/components/FormatHelp.tsx` — ajuda de formatação

## URLs do Frontend

- `/page/*` — visualização de página (splat route)
- `/edit/*` — edição/criação de página
- `/admin` — painel administrativo (Settings, Users, Groups, Media)
- `/trash` — lixeira
- `/media` — gerenciador de mídia

## Padrões de Código

- **Formatação do editor:** `handleFormat` callback em `PageEdit.tsx` — lê cursor/seleção do DOM, aplica transformação, atualiza state React via `setContent`, restaura cursor via `requestAnimationFrame`. Substitui o antigo `modifyTextarea` que modificava `ta.value` diretamente no DOM e disparava `input` event.
- **Inserção por clique (MediaPicker):** `insertAtCursor` mesmo padrão — `setContent` + `requestAnimationFrame` para restaurar cursor/scroll.
- **Toolbar orientation:** estado em `PageEdit`, passado via props para `FormatToolbar`. Performance em `localStorage` (`nwiki-toolbar-orientation`). Mobile força orientation horizontal via `matchMedia` listener.
