tests/         # Vitest + Supertest API tests
# Movie Memory Poll

A focused poll app used by the Sessão Aleatória community to find out which nostalgic holiday films people have watched and still remember. It pairs a polished vanilla web experience with a lightweight Express + SQLite backend that stays in sync with a curated Excel spreadsheet.

> [!NOTE]
> The app auto-seeds its SQLite database from `data/filmes_natal_BR_40-50_RT.xlsx` on startup, so updating the spreadsheet is enough to refresh the catalogue.

## Highlights

- Guided two-step flow that greets participants, tracks progress, and thanks them at the end.
- PT-BR copy end-to-end, including error messages tailored for local audiences.
- Automatic poster handling with graceful fallbacks whenever artwork is missing or invalid.
- Conflict-safe upserts ensure participants can change their answers without generating duplicates.
- Endpoints covered by Vitest + Supertest to lock in the most important API paths.

## Architecture at a glance

| Layer | What it does |
| --- | --- |
| `public/` | Single-page UI (HTML/CSS/JS) rendered directly from Express, no frameworks required. |
| `server/` | Express server, request validation, and database access helpers. |
| `data/` | SQLite database plus the Excel workbook that feeds the movie list. |
| `scripts/` | CLI utilities for querying the database, exporting results, and enriching posters. |
| `tests/` | Vitest suite that boots the API against an in-memory database. |

## Getting started

### Prerequisites

- Node.js 20 or newer
- npm (bundled with Node.js)

### Install dependencies

```powershell
npm install
```

### Run locally (with auto-reload)

```powershell
npm run dev
```

Open <http://localhost:3000> to use the survey. Static assets are served from `public/`, while responses are persisted to `data/poll.db` (created automatically).

```powershell
npm start
```

Run the command above when you want a production-style server without nodemon.

### Execute the test suite

```powershell
npm test
```

Tests rely on an in-memory SQLite database, so they do not touch the files in `data/`.

## Data management

> [!TIP]
> Remove `data/poll.db` while the server is stopped if you ever need a clean slate—the database will be regenerated from the spreadsheet on the next launch.

- **Export answers**: generate `data/poll-export.xlsx` with all participant responses.
	```powershell
	npm run export:excel
	```
- **Run ad-hoc queries**: inspect the database without leaving the terminal.
	```powershell
	npm run db:query -- "SELECT COUNT(*) AS total FROM responses;"
	```
- **Configure a different database path**: set `$env:DB_PATH` before any script or server command to point to a custom location.

### Poster enrichment

```powershell
$env:TMDB_API_KEY="SEU_TOKEN_V4"
npm run posters:fetch
```

The script only fills missing posters and waits between requests to avoid TMDB throttling.

## Scripts reference

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with nodemon for iterative development. |
| `npm start` | Run the production-style server. |
| `npm test` | Execute Vitest + Supertest API tests. |
| `npm run db:query` | Execute a SQL statement against the poll database (defaults to listing tables). |
| `npm run export:excel` | Export responses to `data/poll-export.xlsx`. |
| `npm run posters:fetch` | Fetch missing poster URLs from TMDB using `TMDB_API_KEY`. |

## API overview

| Method & Path | Purpose | Payload |
| --- | --- | --- |
| `GET /api/movies` | Retrieve the ordered list of movies (id, title, year, posterUrl). | – |
| `POST /api/participants` | Register a participant and receive `participantId`. | `{ "name": "Jordan" }` |
| `POST /api/responses` | Create or update a participant answer for a movie. | `{ participantId, movieId, watched, remembered }` |
| `GET /health` | Lightweight readiness probe. | – |

All endpoints return localized, user-friendly error messages when validation fails.

## Folder map

```
public/        # Static UI (HTML, CSS, JS)
server/        # Express app, routes, and SQLite helpers
scripts/       # CLI utilities for data management
data/          # SQLite database and Excel source
tests/         # Vitest integration tests
```

## Troubleshooting

> [!WARNING]
> Errors mentioning `Arquivo de filmes não encontrado` mean the Excel workbook is missing. Restore `data/filmes_natal_BR_40-50_RT.xlsx` or point `DB_PATH` to an existing dataset before starting the server.

- Poster URLs must be absolute; invalid links are ignored and the UI shows a placeholder.
- When running `npm run posters:fetch`, an invalid `TMDB_API_KEY` returns rate-limit or auth errors—double-check that you are using a v4 token.
- Nodemon restarts can fail on file permission errors in `data/`; ensure the folder is writable on Windows.
