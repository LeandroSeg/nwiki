# NWIKI

NWIKI é uma aplicação que imita o Dokuwiki, um excelente editor de wiki hospedável que não usa banco de dados.  O NWIKI está em GPL-3.0.

# Teste local

- baixe o projeto do github
- npm run dev

# Produção nuvem

- vide deploy-ubuntu.md no root deste repo

# Demo url

https://www.kratomsoftware.com.br/wiki

# Examples
## .ENV example

```
PORT=3001
PAGES_DIR=../public/wiki/pages
MEDIA_DIR=../public/wiki/media
TRASH_DIR=../public/wiki/pages/_trash
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=*
LOG_LEVEL=info
START_PAGE=start
```


## Arquitetura do nwiki

### Visão Macro

```
┌──────────────────────────────────────────────────────────────┐
│                      Monorepo (nwiki)                        │
│                                                              │
│   ┌───────────────────┐      ┌───────────────────┐           │
│   │  client/ (Vite)   │      │  server/ (Express) │           │
│   │  React 19 + SPA   │◄────►│  REST API + SSR    │           │
│   │  Porta 5173 (dev) │      │  Porta 3001        │           │
│   └───────────────────┘      └───────────────────┘           │
│         │                          │                          │
│         │   proxy /wiki/api        │                          │
│         └──────────────────────────┘                          │
│                                                              │
│   ┌──────────────────────────────────────────┐                │
│   │  public/wiki/pages/    ← .txt persistência│               │
│   │  public/wiki/media/    ← uploads         │                │
│   │  server/data/          ← config/users    │                │
│   └──────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

### Fluxo de Requisição

```
Browser ──► nginx (:443)
               │
               ▼
          /wiki/api/* ──► proxy_pass /api/* ──► Express (:3001)
          /wiki/page/* ──► proxy_pass /* ──► Express → serve index.html
          /wiki/assets/* ──► proxy_pass /assets/* ──► Express → serve arquivo estático
```

**Em dev:** Vite substitui o nginx — faz proxy só de `/wiki/api` → Express, todo o resto é servido pelo hot-reload do Vite.

### Server (Express 5 + TypeScript)

**Pipeline de middleware** (`server/src/index.ts`):

```
1. helmet          → CSP, headers de segurança
2. cors            → CORS configurável
3. requestTimeout  → 30s timeout global
4. /wiki rewrite   → (fix) converte /wiki/* → /* para acesso direto
5. rateLimiters    → auth (10/h), write (60/h), read (200/h)
6. body parsers    → JSON + urlencoded, 1mb limit
7. authRoutes      → /api/auth (login, setup, register, profile, approve)
8. configRoutes    → /api/config (público, lê locked/siteName)
9. lockCheck       → barra tudo se wiki locked (admins passam)
10. pagesRoutes    → /api/pages/* (CRUD + trash + groups)
11. mediaRoutes    → /api/media/* (upload/download, validação MIME)
12. searchRoutes   → /api/search?q= (MiniSearch full-text)
13. renderRoutes   → /api/render/*id (DokuWiki → HTML c/ cache)
14. adminRoutes    → /api/admin/* (config/users/groups)
15. static         → client/dist/ (arquivos buildados)
16. catch-all      → index.html (SPA routing)
17. error handler  → 500 genérico
```

### Client (React 19 + Vite + Tailwind v4)

**Providers aninhados** (`App.tsx:207-215`):

```
<ThemeProvider>
  <BrowserRouter basename="/wiki">
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
</ThemeProvider>
```

**Rotas SPA**:

| Path | Componente | Acesso |
|---|---|---|
| `/` | `HomePage` → redireciona para `startPage` ou `PageList` | Público |
| `/page/*` | `PageView` | Público |
| `/edit/*` | `PageEdit` | Autenticado |
| `/search?q=` | `PageSearch` | Público |
| `/login` | `Login` | Público |
| `/register` | `Register` | Público |
| `/setup` | `Setup` | Só se não há admin |
| `/admin` | `Admin` (Settings, Users, Groups, Media) | Autenticado |
| `/trash` | `Trash` | Autenticado |
| `/settings` | `Settings` | Autenticado |
| `/media` | `MediaManager` | Autenticado |

### Persistência (sem banco relacional)

| Dado | Local | Formato |
|---|---|---|
| Páginas | `public/wiki/pages/` | `.txt` (DokuWiki markup) |
| Mídia | `public/wiki/media/` | Arquivos originais |
| Meta (ACL) | `_meta/<flatname>.json` | JSON com `groups[]` |
| Lixeira | `_trash/` | `.txt` movidos |
| Cache render | `_cache/` | `.html` pré-renderizados |
| Config global | `server/data/config.json` | JSON |
| Usuários | `server/data/users.json` | JSON (bcrypt hashes) |
| Grupos | `server/data/groups.json` | JSON |
| Lockout | `server/data/lockout.json` | JSON |
| Blacklist JWT | `server/data/blacklist.json` | JSON |
| Índice busca | Em memória (MiniSearch) | Reconstrói no startup |

### Componentes-chave do Server

**`safeResolve`** (`fileHandler.ts`) — função central que todo acesso a arquivo passa: converte ID pra lowercase, bloqueia `..`, resolve contra `baseDir`, verifica profundidade máxima (5 níveis), checa `startsWith` pra evitar path traversal. Único ponto de entrada para manipulação de arquivos.

**`wildcardParam`** (`params.ts`) — helper que extrai o splat param do Express 5 (que retorna `string[]` ou `string`), faz `.join('/')`, e padroniza a extração em todas as rotas. Reduziu 12 repetições manuais.

**Parser DokuWiki** (`dokuwiki.ts`) — engine de renderização que converte markup DokuWiki para HTML. Suporta: headings (`======`), bold/italic, links internos (`[[page]]`) e externos, imagens, tabelas, listas ordenadas e não ordenadas, sublinhado, monospace, `<sub>/<sup>`, quebras de linha forçadas. Links gerados com prefixo `/wiki/page/`.

**Render cache** (`renderCache.ts`) — cache em memória + disco. No startup carrega HTMLs do diretório `_cache/`. Na renderização, checka mem-cache primeiro, depois disk-cache, depois renderiza do zero. Invalidação por página (delete/unlink do arquivo). Cache total resetado com `rm -rf _cache/`.

**Sanitização XSS** (`sanitize.ts`) — DOMPurify rodando server-side via JSDOM. Elimina SVG malicioso, obfuscação de case, data URIs, embed/object, meta refresh, forms, links javascript:.

### Modos de Execução

| Modo | Comando | Frontend | Backend | Proxy |
|---|---|---|---|---|
| Dev | `npm run dev` | Vite :5173 (HMR) | Express :3001 (tsx watch) | Vite proxy `/wiki/api` |
| Build | `npm run build` | Vite build → `client/dist/` | tsc → `server/dist/` | nginx |
| Prod | `npm start` | Servido por Express como static | Express :3001 | nginx (recomendado) |
| Prod+PM2 | `npm run pm2:start` | Idem | PM2 gerencia processo | nginx |

### Segurança

- **JWT** com `jti` + blacklist + validação de `iat` futuro
- **Rate limiting** em 3 tiers: auth (10/h), write (60/h), read (200/h)
- **Lockout** após 5 falhas de login (15 min), cleanup automático de expirados
- **Path traversal** bloqueado por `safeResolve()` com verificação dupla (regex `\.\.` + `startsWith`)
- **Upload** validado por magic bytes + extensão whitelist
- **Helmet CSP** restritiva (só self + Google Fonts + data: para img)
- **Senhas** com bcrypt (hash + salt)
- **Bloqueio remoto** (lock/unlock) toggleável via admin — barra todas as rotas exceto login/admin
- **DOMPurify** server e client-side

### Controle de Acesso

- **Grupos:** TODOS (padrão) + grupos customizáveis pelo admin
- **Tipos de usuário:** A (Admin), B (Consumidor), C (Editor), D (Criador)
- **Permissão por página:** admin define quais grupos acessam cada página via `PUT /api/pages/*/groups`
- **Herança:** página filha herda ACL do pai se o pai tem grupos customizados
- **Busca filtrada:** resultados de search excluem páginas que o usuário não pode ver

---

