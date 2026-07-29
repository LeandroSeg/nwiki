# Deploy nwiki no Ubuntu (nginx + pm2)

## 1. Pré-requisitos

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx curl git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Clonar e preparar o repositório

```bash
cd /var/www
sudo git clone <url-do-repositorio> nwiki
sudo chown -R $USER:$USER nwiki
cd nwiki
```

## 3. Configurar ambiente

```bash
# Gerar JWT_SECRET
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Criar .env do server
cat > server/.env << EOF
PORT=15540
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
CORS_ORIGIN=*
LOG_LEVEL=info
START_PAGE=start
PAGES_DIR=../public/wiki/pages
MEDIA_DIR=../public/wiki/media
TRASH_DIR=../public/wiki/pages/_trash
EOF

# Criar diretório de logs
mkdir -p logs

# Ajustar permissões
chmod -R 755 public/wiki/pages
chmod -R 755 public/wiki/media
```

## 4. Instalar dependências e compilar

```bash
# Server
cd server
npm install
npm run build     # compila src/ → dist/ via tsc

# Client
cd ../client
npm install
npm run build     # compila para client/dist/ via Vite

cd ..
```

## 5. Iniciar com pm2

```bash
# A partir da raiz do projeto (/var/www/nwiki)
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup       # exibe um comando — copie e execute para iniciar no boot
```

Verifique se está rodando:

```bash
curl http://127.0.0.1:15540/wiki/
```

Deve retornar o HTML do SPA (não um JSON de erro).

## 6. Configurar nginx

Crie `/etc/nginx/sites-available/nwiki`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location /wiki/ {
        proxy_pass http://127.0.0.1:15540/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    location = /wiki {
        return 301 /wiki/;
    }
}
```

> **Importante:** A barra no final do `proxy_pass` (`http://127.0.0.1:15540/`) faz o nginx remover o prefixo `/wiki` antes de enviar ao Express. O Express tem um middleware de rewrite interno que também trata `/wiki/*` → `/*`, então ambas as configurações funcionam.

Ative o site:

```bash
sudo ln -s /etc/nginx/sites-available/nwiki /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 7. SSL com Let's Encrypt (recomendado)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

## 8. Primeiro acesso

Acesse `https://seu-dominio.com/wiki/`.

Na primeira execução, o sistema redireciona para `/wiki/setup` para criar o usuário administrador. Após o setup, faça login e configure o wiki em `/wiki/admin`.

## 9. Arquitetura do deploy

```
/var/www/nwiki/
├── server/
│   ├── dist/                ← compilado por tsc (src/ → dist/)
│   ├── .env                 ← configuração
│   ├── data/
│   │   └── config.json      ← gerado pelo admin
│   └── package.json
├── client/
│   ├── dist/                ← compilado por Vite (servido pelo Express)
│   └── package.json
├── public/
│   └── wiki/
│       ├── pages/           ← arquivos .txt das páginas
│       │   └── _cache/      ← render cache (gerado automaticamente)
│       └── media/           ← arquivos de mídia
├── logs/                    ← logs do pm2
├── ecosystem.config.cjs     ← configuração do pm2
└── deploy/                  ← scripts auxiliares
```

Fluxo da requisição:

```
Navegador → nginx (:443) → proxy_pass /wiki/ → Express (:15540)
                                                     │
                                          ┌──────────┴──────────┐
                                          │ rewrite /wiki/* → /* │
                                          └──────────┬──────────┘
                                                      │
                                          servidor estático (client/dist/)
                                          ou rota de API (/api/*)
                                          ou SPA fallback (/*path → index.html)
```

O Express serve **tudo** — API, arquivos estáticos do front-end e fallback SPA. O nginx só faz proxy reverso e SSL.

## 10. Comandos úteis

| Ação | Comando |
|---|---|
| Status pm2 | `pm2 status` |
| Logs do nwiki | `pm2 logs nwiki-server` |
| Monitorar recursos | `pm2 monit` |
| Reiniciar | `pm2 restart nwiki-server` |
| Parar | `pm2 stop nwiki-server` |
| Atualizar código | `git pull && cd server && npm install && npm run build && cd ../client && npm install && npm run build && cd .. && pm2 restart nwiki-server` |
| Testar nginx | `sudo nginx -t` |
| Reiniciar nginx | `sudo systemctl restart nginx` |
| Logs nginx | `sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log` |
| Rodar testes | `cd server && npm test` |

## 11. Troubleshooting

**Página em branco ou 404 no SPA:** Verifique se o Express está servindo os arquivos estáticos corretamente. Teste com `curl http://127.0.0.1:15540/wiki/index.html` — deve retornar o HTML do SPA.

**API retornando 404:** Confirme que o middleware de rewrite `/wiki/*` → `/*` está ativo no `server/src/index.ts`. Sem ele, as rotas da API esperam `/api/*` mas recebem `/wiki/api/*`.

**Estilos/Tailwind quebrados:** Provavelmente o client não foi compilado. Execute `cd client && npm run build`.

**Erro 403 nas páginas:** O usuário do pm2 precisa ter permissão de escrita em `public/wiki/pages/`, `public/wiki/media/` e `server/data/`.

**Erro 503 (wiki bloqueado):** Acesse `/wiki/admin` com uma conta admin e desbloqueie em Configurações.

**JWT_SECRET inválido:** Nunca use o valor padrão `change-me-in-production` em produção. Gere um novo com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e atualize o `.env`.
