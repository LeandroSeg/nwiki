# nwiki — Insights e Decisões

## Arquitetura

- **Monorepo** com `server/` + `client/` — Vite proxy `/api` → Express em dev, Express serve built em prod
- **File-based storage:** páginas como `.txt` em `public/wiki/pages/`, mídia em `public/wiki/media/`
- **Meta data:** permissões de página armazenadas em `_meta/<flatname>.json` (underscore substitui `/`)
- **Trash:** soft-delete move para `_trash/` (configurável via `TRASH_DIR` no `.env`)
- **Config global:** `server/data/config.json` (siteName, fontSize, locked, language)

## Segurança

- **JWT** com `jti` + blacklist + validação de `iat` futuro
- **Rate limiting** em 3 tiers: auth (10/h), write (60/h), read (200/h)
- **Lockout** após 5 falhas de login (15 min)
- **Path traversal** bloqueado com `safeResolve()` + profundidade máxima (5 níveis)
- **Upload** validado por magic bytes + MIME whitelist
- **XSS:** server-side sanitize + DOMPurify no frontend
- **Helmet** com CSP restritiva
- **optionalAuth** middleware para rotas públicas que precisam identificar o usuário

## Controle de Acesso

- **Grupos:** TODOS (padrão) + grupos customizáveis pelo admin
- **Tipos de usuário:** A (Admin), B (Consumidor), C (Editor), D (Criador)
- **Permissão por página:** admin define quais grupos acessam cada página
- **Herança:** nova página filha herda grupos do pai (se pai tiver grupos customizados)
- **Busca filtrada:** resultados excluem páginas que o usuário não pode acessar

## i18n

- **Idiomas:** pt (padrão) e en — via `LanguageContext` + `translations.ts`
- **Seletor no Admin** → `PUT /api/admin/config { language }`
- **Traduções centralizadas** em `client/src/i18n/translations.ts`

## Decisões Técnicas

- `*id` pattern do Express 5 retorna `string[]` — usar `.join('/')` para obter path completo
- React Router usa `*` splat para páginas com multi-segmento (`/page/*` em vez de `/page/:id`)
- Testes usam `USERS_FILE` separado para não poluir dados de produção
- `safeResolve` usa `path.resolve` com verificação de `startsWith` para anti-path-traversal
- `vitest.config.ts` tem `fileParallelism: false` + `pool: 'forks'` — necessário porque testes compartilham filesystem (criam/removem fixtures concorrentemente)
- Testes de lifecycle usam fixtures com nomes fixos (`lifecycle-test.txt`), sem UUID — gerenciados via `beforeEach`/`afterEach` que limpa tudo
- Testes de search ignoram `idSchema` porque buscam no índice, não em rota com wildcard param

## Fase 1 — Correções de bugs e segurança
- **Teste falhando:** `safecheck.txt` removido dos fixtures; `beforeEach` agora limpa fixtures entre testes
- **XSS sanitization:** substituído regex frágil por DOMPurify (server-side via JSDOM) — 9 novos testes (SVG, obfuscação de case, data URI, embed/object, meta refresh, form, link, plain text, markup DokuWiki)
- **Rate-limit no profile:** `PUT /api/auth/profile` usa `RATE_LIMITS.write` (60/h) — antes ilimitado

## Fase 2 — Qualidade de código
- **LOCKOUT_FILE / BLACKLIST_FILE:** env vars configuráveis (default: `server/data/lockout.json`, `server/data/blacklist.json`) — antes hardcoded
- **Lockout cleanup:** `readLockouts()` filtra entradas expiradas ao carregar — evita acúmulo de bloqueios velhos
- **Admin role endpoint:** `PUT /api/admin/users/:username/role` + `updateUserRole()` em `users.ts` — antes não existia
- **Wildcard param helper:** `server/src/lib/params.ts` → `wildcardParam(req, paramName)`. Extrai param splat do Express 5, trata array vs string, faz `.join('/')`. Substituiu 12 repetições manuais em 4 route files (pages, render, media, admin). Reduz duplicação e padroniza extração.

## Fase 3 — Cobertura de testes
- **Admin tests:** 19 testes em `tests/admin.test.ts` — config CRUD, users list, activate/deactivate, role/type/groups, groups CRUD, auth checks
- **ACL + lockout + blacklist:** 12 testes em `tests/access.test.ts` — page groups set/get/403/401/reset, 5-attempt lockout, 429 login, unlock, token blacklist add/check
- **Lifecycle:** 6 testes em `tests/lifecycle.test.ts` — aprovação de usuário, trash list/auth, trash/restore flow, permanent delete

## Compatibilidade cloud (Windows + Linux)
- Commit `38b1d80` adicionou `.toLowerCase()` em todas as rotas de página e no `safeResolve()` para compatibilidade com Linux (case-sensitive filesystem)
- `dokuwiki.ts` mudou links de `/page/` para `/wiki/page/` + lowercase nas links/imagens
- `<BrowserRouter basename="/wiki">` no frontend
- Vite config `base: '/wiki/'` com proxy `/wiki/api` → Express `/api`
- **Problema:** acesso direto ao Express (sem nginx/Vite) quebrava porque assets em `/wiki/assets/*` não eram encontrados e APIs em `/wiki/api/*` não casavam rotas
- **Fix:** middleware de rewrite em `server/src/index.ts` que converte `/wiki/*` → `/*` no início do pipeline Express — assets, API e SPA funcionam igual com ou sem proxy
- **Cache:** `_cache/` limpo para forçar re-renderização com links `/wiki/page/` atualizados

## Editor — FormatToolbar
- **20 botões:** Bold, Italic, Underline, Strikethrough, Code, H1-H3, Internal/External Link, Image, Media, Bullet/Numbered List, Table, HR, Line Break, Subscript, Superscript
- **modifyTextarea (removido):** alterava `ta.value` diretamente no DOM e disparava `input` event nativo para sincronizar state React. Padrão frágil — se re-render acontecesse antes do React processar o evento, state sobrescrevia DOM com valor antigo.
- **onFormat callback:** `PageEdit.handleFormat` lê cursor/seleção do DOM, chama `setContent(result.value)`, restaura cursor/scroll via `requestAnimationFrame`. Elimina a dependência do `input` event. Mesmo padrão usado por `insertAtCursor` (MediaPicker).
- **Orientation:** horizontal (padrão) ou vertical (`flex-col w-12` → `grid grid-cols-2`). Preferência em `localStorage`. Mobile força horizontal via `matchMedia('max-width: 639px')` listener.
- **Vertical 2 colunas:** `grid grid-cols-2` com separadores `col-span-2` — reduz altura em ~50% comparado a 1 coluna.

## Mobile
- **Barra vertical:** `hidden sm:flex` — oculta em telas <640px
- **Textarea:** `min-h-[40vh]` mobile + `sm:h-[55vh]` desktop — evita textarea muito pequena em celular
- **Botões de ação:** `flex-wrap` para quebrar em telas estreitas (Save/Cancel/Delete)
- **Upload forms:** `flex-col sm:flex-row` no MediaManager e MediaPickerModal
- **Header:** Admin/Settings/username/theme escondidos (`hidden sm:inline`) no mobile
- **Media query listener:** em PageEdit, detecta mudança de tamanho e força orientation horizontal automaticamente

## Preview
- `POST /api/render` — recebe `{ markup }`, retorna `{ html }`. Rota autenticada com rate-limit de leitura.
- `PreviewDialog` — modal `max-h-[85vh]` com scroll, renderiza via `SanitizedContent`. Fecha ao clicar fora ou no botão.

## GPL-3.0
- Licenciado sob GPL-3.0-or-later — SPDX headers em todos os 57 arquivos `.ts`/`.tsx`, `LICENSE` na raiz, `license` field nos 3 `package.json`
