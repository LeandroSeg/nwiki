# nwiki — Tarefas e Progresso

## Concluído ✅

- [x] Monorepo scaffold (server + client + PM2)
- [x] Backend: fileHandler, users, auth (login/setup/register)
- [x] CRUD páginas `.txt` + soft-delete (trash)
- [x] Upload/download mídia com validação MIME (50+ formatos)
- [x] Full-text search com MiniSearch
- [x] Helmets CSP, rate limiting, lockout, path traversal
- [x] Parser DokuWiki → HTML (headings, bold, italic, links, imagens, tabelas, listas)
- [x] Dark/light mode toggle
- [x] i18n pt/en completo
- [x] Painel admin: Settings, Users, Groups, Media
- [x] Controle de acesso por grupos + tipos de usuário (A/B/C/D)
- [x] Breadcrumb navegável com namespace support
- [x] Página inicial configurável (START_PAGE)
- [x] Gerenciador de mídia com pastas, preview, upload, delete, copy embed
- [x] Botão Criar Página ao clicar em link inexistente (autenticados)
- [x] Cache de renderização global (memória + disco, persiste restart)
- [x] 105 testes passando (10 arquivos)
- [x] Memória persistente (MEMORY_*.md)
- [x] Auditoria de segurança: admin-only trash, optionalAuth em rotas públicas, anti-path-traversal
- [x] Botão de ajuda de formatação no editor (modal com sintaxe DokuWiki, pt/en)
- [x] **Fase 1:** Correções de bugs e segurança — teste falhando, XSS DOMPurify (9 testes), rate-limit profile
- [x] **Fase 2:** Qualidade de código — LOCKOUT_FILE/BLACKLIST_FILE env vars, lockout cleanup, admin role endpoint, wildcardParam() helper
- [x] **Fase 3:** Cobertura de testes — admin (19), ACL/lockout/blacklist (12), lifecycle (6)
- [x] **Compatibilidade cloud:** lowercase em paths + prefixo `/wiki` + middleware de rewrite no Express para acesso direto
- [x] **GPL-3.0:** Licença em todos os 57 arquivos `.ts`/`.tsx` + `LICENSE` + `package.json` (3 pacotes)
- [x] **FormatToolbar:** 20 botões de formatação DokuWiki (bold, italic, listas, links, imagem, tabela, sub/sup, etc.)
- [x] **Orientation toggle:** toolbar horizontal/vertical com preferência em `localStorage`
- [x] **Preview:** `POST /api/render` + `PreviewDialog` modal
- [x] **MediaPickerModal:** substitui `window.open('/wiki/media')` — insere `{{:filename|}}` no cursor via `insertAtCursor()`
- [x] **Botão "up" no MediaManager:** navegação para diretório pai
- [x] **Bug preview desfazendo formatação:** `modifyTextarea` removido, substituído por `onFormat` callback que atualiza state React diretamente
- [x] **2 colunas na barra vertical:** `grid grid-cols-2` em vez de `flex-col`
- [x] **Mobile:** barra vertical oculta <640px, formulários de upload empilham, header simplificado, media query listener força orientation horizontal

## Pendentes 📋

- [ ] Backup/export das páginas
- [ ] Histórico de versões das páginas
- [ ] Import de páginas DokuWiki existentes
- [ ] Documentação de instalação para novos usuários
