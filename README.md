- **Preencha pôsteres automaticamente** executando `npm run posters:fetch` com `TMDB_API_KEY` definido. O script procura pôsteres faltantes usando títulos (PT-BR e original) e ano como pista.
- **Reset data** by deleting `data/poll.db` while the server is stopped; a fresh database will be generated with the spreadsheet contents. As respostas antigas para filmes removidos do Excel são limpas automaticamente.

### Poster enrichment (optional)

1. Garanta que possui uma chave válida do [OMDb](https://www.omdbapi.com/).
2. Defina a variável de ambiente e execute o script:

```powershell
$env:OMDB_API_KEY="SUA_CHAVE"
npm run posters:fetch
```

O script atualiza apenas as linhas que estiverem sem pôster e respeita o ordenamento existente.

- **Reset data** by deleting `data/poll.db` while the server is stopped; a fresh database will be generated with the spreadsheet contents. As respostas antigas para filmes removidos do Excel são limpas automaticamente.
# Movie Memory Poll

A lightweight full-stack web app for polling which iconic movies a group of people has seen and still remembers. Participants enter their name, step through a curated list of films, and answer two quick questions for each title. Responses are stored in a local SQLite database, giving you an easy way to aggregate viewing habits later on.

## ✨ Features

- **Guided flow** – welcoming screen, progress indicator, and polished UI for answering each movie prompt.
- **Interface em Português (Brasil)** – toda a experiência foi traduzida para PT-BR para participantes locais.
- **Pergunta condicional inteligente** – se alguém não viu o filme, marcamos automaticamente "Não lembro" e desativamos a segunda pergunta.
- **Cartazes dos filmes** – cada filme aparece com o pôster correspondente, lido diretamente da planilha.
- **Lista dinâmica de filmes** – o catálogo exibido vem de `data/filmes_natal_BR_40-50_RT.xlsx`, lido automaticamente na inicialização do servidor.
- **Reliable persistence** – responses are stored per-participant using SQLite with conflict-safe upserts.
- **API ready** – REST endpoints for movies, participant registration, and response submission.
- **Tested** – Jest + Supertest coverage for the critical API paths.

## 🚀 Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (bundled with Node.js)

### Installation

Clone the repository (or open the provided folder), then install dependencies:

```powershell
npm install
```

### Development server

Run the backend with automatic reloads and open the app at <http://localhost:3000>:

```powershell
npm run dev
```

The Express server serves the static frontend from `public/`. Any data you collect is stored in `data/poll.db` (created automatically on first run).

### Production build / runtime

To launch without auto-reload:

```powershell
npm start
```

### Tests

Execute the Jest test suite:

```powershell
npm test
```

### Exporting results

Gere uma planilha com todas as respostas coletadas executando:

```powershell
npm run export:excel
```

O arquivo `data/poll-export.xlsx` será sobrescrito com as colunas de participante, filme, se foi assistido e se o participante se lembra. Para usar um banco diferente, defina a variável de ambiente `DB_PATH` antes de rodar o script (por exemplo, `$env:DB_PATH="e:\\outro\\poll.db"` no PowerShell).

## 🧱 Project structure

```
public/        # HTML, CSS, and vanilla JS single-page UI
server/        # Express app plus SQLite setup & seed data
tests/         # Jest + Supertest API tests
package.json   # Scripts and dependencies
```

## 📡 API reference

| Method & Path          | Description                                           | Body                                      |
|------------------------|-------------------------------------------------------|-------------------------------------------|
| `GET /api/movies`      | Retrieve the ordered list of movies in the poll.      | –                                         |
| `POST /api/participants` | Register a participant and get their `participantId`. | `{ "name": "Jamie" }`                    |
| `POST /api/responses`  | Record or update a participant's answers for a movie. | `{ participantId, movieId, watched, remembered }` |

Responses include human-friendly error messages when validation fails.

## 🛠 Customization tips

- **Atualize o Excel** (`data/filmes_natal_BR_40-50_RT.xlsx`) para incluir, remover ou reorganizar filmes e reinicie o servidor para sincronizar. Use a coluna `Poster URL` para apontar para a arte do filme.
- **Preencha pôsteres automaticamente** executando `npm run posters:fetch` com `OMDB_API_KEY` definido. O script procura pôsteres faltantes usando títulos (PT-BR e original) e ano como pista.
- **Reset data** by deleting `data/poll.db` while the server is stopped; a fresh database will be generated with the spreadsheet contents. As respostas antigas para filmes removidos do Excel são limpas automaticamente.
- **Exporte os resultados** com `npm run export:excel` para gerar `data/poll-export.xlsx` e compartilhar os dados coletados.
- **Extend analytics** by adding new routes (e.g., `/api/stats`) and leveraging the existing SQLite connection helpers.

### Poster enrichment (optional)

1. Garanta que possui uma chave válida do [TMDB](https://www.themoviedb.org/).
2. Defina a variável de ambiente e execute o script:

```powershell
$env:TMDB_API_KEY="SUA_CHAVE"
npm run posters:fetch
```

O script atualiza apenas as linhas que estiverem sem pôster e mantém a ordem existente.

## 🧹 Housekeeping

- Node/NPM logs and the SQLite database file are already ignored via `.gitignore`.
- Tests run against an in-memory database to keep them isolated and fast.

Happy polling! 🍿
