Aqui está um plano de desenvolvimento detalhado para criar um **clone simplificado do DokuWiki em Node.js**, mantendo compatibilidade com os arquivos de texto e adicionando autenticação via JWT:

---

## 🎯 Objetivos principais
- **Compatibilidade**: Utilizar arquivos `.txt` no mesmo formato que o DokuWiki (markup simples).
- **Estrutura de diretórios**: Definida via `.env` (`PAGES_DIR`, `MEDIA_DIR`).
- **Autenticação**: Acesso restrito a certas páginas usando JWT.
- **Simplicidade**: Código enxuto, sem dependências pesadas.

---

## 🛠️ Arquitetura proposta

### 1. **Configuração inicial**
- Criar projeto Node.js com `express`.
- Usar `dotenv` para carregar variáveis de ambiente:
  ```env
  PAGES_DIR=./data/pages
  MEDIA_DIR=./data/media
  JWT_SECRET=supersegredo
  ```

### 2. **Estrutura de pastas**
```
project/
 ├─ src/
 │   ├─ routes/
 │   │   ├─ auth.js
 │   │   ├─ pages.js
 │   │   └─ media.js
 │   ├─ middleware/
 │   │   └─ authMiddleware.js
 │   ├─ utils/
 │   │   └─ fileHandler.js
 │   └─ server.js
 ├─ data/
 │   ├─ pages/
 │   │   └─ exemplo.txt
 │   └─ media/
 │       └─ imagem.png
 ├─ .env
 └─ package.json
```

### 3. **Autenticação (JWT)**
- Rota `/login` que gera token JWT após validação de usuário/senha.
- Middleware `authMiddleware.js` que valida token e restringe acesso a páginas protegidas.

### 4. **Manipulação de páginas**
- Rota `/pages/:id`:
  - **GET** → lê arquivo `.txt` do diretório `PAGES_DIR`.
  - **POST/PUT** → grava ou atualiza arquivo `.txt`.
  - **DELETE** → remove arquivo.
- Compatibilidade: manter sintaxe simples (sem necessidade de parser complexo, apenas leitura/escrita).

### 5. **Manipulação de mídia**
- Rota `/media/:filename`:
  - **GET** → serve arquivos do diretório `MEDIA_DIR`.
  - **POST** → upload de arquivos.
  - **DELETE** → remove arquivo.

### 6. **Controle de acesso**
- Definir no arquivo `.env` ou em um JSON quais páginas exigem login:
  ```json
  {
    "restrictedPages": ["admin", "config"]
  }
  ```
- Middleware verifica se a página está na lista e exige JWT.

---

## 📌 Fluxo de funcionamento
1. Usuário acessa `/login` → recebe JWT.
2. Com JWT, acessa páginas restritas via `Authorization: Bearer <token>`.
3. Sistema lê/escreve arquivos `.txt` diretamente no diretório configurado.
4. Mídia é servida como arquivos estáticos, mas com controle de acesso se necessário.

---

## 🚀 Próximos passos
1. Inicializar projeto com `express` e `dotenv`.
2. Implementar autenticação JWT (`jsonwebtoken`).
3. Criar rotas de leitura/escrita de arquivos.
4. Adicionar middleware de restrição.
5. Testar compatibilidade com arquivos existentes do DokuWiki.

---



Perfeito, vamos expandir o plano para incluir **edição e criação de páginas apenas para usuários autenticados**, mantendo a filosofia de não usar banco de dados — tudo será feito diretamente em arquivos de texto e pastas.

---

## 🔑 Requisitos adicionais
- **Autenticação obrigatória** para criar ou editar páginas.
- **Persistência em arquivos**: nada de banco de dados, apenas leitura/escrita em disco.
- **Compatibilidade**: formato `.txt` igual ao DokuWiki.
- **Controle de acesso**: páginas públicas podem ser lidas sem login, páginas restritas exigem JWT.

---

## 🛠️ Arquitetura revisada

### 1. Rotas de páginas
- **GET `/pages/:id`** → retorna conteúdo do arquivo `.txt`.
- **POST `/pages/:id`** → cria nova página (se não existir).  
  - Requer JWT válido.
- **PUT `/pages/:id`** → edita página existente.  
  - Requer JWT válido.
- **DELETE `/pages/:id`** → remove página.  
  - Requer JWT válido.

### 2. Middleware de autenticação
- `authMiddleware.js`:
  - Verifica `Authorization: Bearer <token>`.
  - Se válido, permite edição/criação.
  - Se inválido, bloqueia.

### 3. Manipulação de arquivos
- Utilizar `fs` (File System) do Node.js:
  ```js
  const fs = require('fs');
  const path = require('path');

  const pagesDir = process.env.PAGES_DIR;

  function getPagePath(id) {
    return path.join(pagesDir, `${id}.txt`);
  }

  function readPage(id) {
    return fs.readFileSync(getPagePath(id), 'utf-8');
  }

  function writePage(id, content) {
    fs.writeFileSync(getPagePath(id), content, 'utf-8');
  }

  function deletePage(id) {
    fs.unlinkSync(getPagePath(id));
  }
  ```

### 4. Exemplo de rotas com Express
```js
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const pagesDir = process.env.PAGES_DIR;

// Middleware de autenticação
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token necessário' });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Token inválido' });
  }
}

// GET página
router.get('/:id', (req, res) => {
  const filePath = path.join(pagesDir, `${req.params.id}.txt`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Página não encontrada' });
  const content = fs.readFileSync(filePath, 'utf-8');
  res.send(content);
});

// Criar nova página (auth)
router.post('/:id', authMiddleware, (req, res) => {
  const filePath = path.join(pagesDir, `${req.params.id}.txt`);
  if (fs.existsSync(filePath)) return res.status(400).json({ error: 'Página já existe' });
  fs.writeFileSync(filePath, req.body.content || '', 'utf-8');
  res.json({ success: true });
});

// Editar página (auth)
router.put('/:id', authMiddleware, (req, res) => {
  const filePath = path.join(pagesDir, `${req.params.id}.txt`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Página não encontrada' });
  fs.writeFileSync(filePath, req.body.content || '', 'utf-8');
  res.json({ success: true });
});

// Deletar página (auth)
router.delete('/:id', authMiddleware, (req, res) => {
  const filePath = path.join(pagesDir, `${req.params.id}.txt`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Página não encontrada' });
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

module.exports = router;
```

---

## 📌 Fluxo de uso
1. Usuário faz login → recebe JWT.
2. Com JWT, pode criar (`POST`) ou editar (`PUT`) páginas.
3. Sem JWT, só pode ler páginas públicas.
4. Arquivos `.txt` são gravados diretamente no diretório definido no `.env`.

---

## 🚀 Próximos passos
- Implementar rota `/login` para gerar JWT.
- Criar configuração de páginas restritas (JSON ou `.env`).
- Adicionar upload de mídia com autenticação opcional.
- Testar compatibilidade com arquivos já existentes do DokuWiki.

---

## Stack

Use node.js + typescript + tailwind + shadcn.

## UI Design

Apresente um design limpo e moderno para apresentação das páginas. Defina uma template que possa facilmente ser modificada.