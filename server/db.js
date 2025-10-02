import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import XLSX from 'xlsx';

const currentDirPath = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(currentDirPath, '../data/poll.db');
const rawDbPath = process.env.DB_PATH || DEFAULT_DB_PATH;
const isInMemory = rawDbPath === ':memory:' || rawDbPath.startsWith('file:');
const DB_PATH = isInMemory ? rawDbPath : path.resolve(process.cwd(), rawDbPath);
const MOVIES_WORKBOOK_PATH = path.join(currentDirPath, '../data/filmes_natal_BR_40-50_RT.xlsx');

let cachedMovies;
let cachedWorkbookStat;

let db;

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initDatabase() {
  if (db) {
    return db;
  }

  if (!isInMemory) {
    ensureDirectoryExists(DB_PATH);
  }
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  migrate();
  seedMovies();

  return db;
}

function migrate() {
  const createParticipants = `
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createMovies = `
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      year INTEGER,
      poster_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createResponses = `
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      watched INTEGER NOT NULL,
      remembered INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(participant_id, movie_id),
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    )
  `;

  db.exec(createParticipants);
  db.exec(createMovies);
  db.exec(createResponses);
  ensureMoviePosterColumn();
}

function seedMovies() {
  const desiredMovies = loadMoviesFromWorkbook();
  const existingMovies = db
    .prepare('SELECT title, year, poster_url FROM movies ORDER BY id ASC')
    .all();

  const isInSync =
    existingMovies.length === desiredMovies.length &&
    existingMovies.every((movie, index) => {
      const desired = desiredMovies[index];
      return (
        movie.title === desired.title &&
        normalizeYear(movie.year) === normalizeYear(desired.year) &&
        normalizePosterUrl(movie.poster_url) === normalizePosterUrl(desired.posterUrl)
      );
    });

  if (isInSync) {
    return;
  }

  const insert = db.prepare(
    'INSERT INTO movies (title, year, poster_url) VALUES (@title, @year, @posterUrl)'
  );
  const transaction = db.transaction((movies) => {
    db.exec('DELETE FROM responses');
    db.exec('DELETE FROM movies');
    movies.forEach((movie) =>
      insert.run({ title: movie.title, year: movie.year, posterUrl: movie.posterUrl })
    );
  });

  transaction(desiredMovies);
}

function resetDatabase() {
  if (!db) {
    return;
  }

  db.exec('DELETE FROM responses');
  db.exec('DELETE FROM participants');
  db.exec('DELETE FROM movies');
  seedMovies();
}

function closeDatabase() {
  if (!db) {
    return;
  }

  db.close();
  db = undefined;
}

function loadMoviesFromWorkbook() {
  if (!fs.existsSync(MOVIES_WORKBOOK_PATH)) {
    throw new Error(`Arquivo de filmes não encontrado em ${MOVIES_WORKBOOK_PATH}`);
  }

  const stat = fs.statSync(MOVIES_WORKBOOK_PATH);
  if (cachedMovies && cachedWorkbookStat && cachedWorkbookStat.mtimeMs === stat.mtimeMs) {
    return cachedMovies;
  }

  const workbook = XLSX.readFile(MOVIES_WORKBOOK_PATH);
  const [firstSheetName] = workbook.SheetNames || [];

  if (!firstSheetName) {
    throw new Error('Nenhuma aba encontrada no arquivo de filmes.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: undefined });

  const parsed = rows
    .map((row, index) => {
      const portugueseTitle = asTrimmedString(row['Nome do filme (PT-BR)']);
      const releaseYear = normalizeYear(row['Ano de Lançamento']);
      const posterUrl = normalizePosterUrl(row['Poster URL'] || row['Poster']);

      if (!portugueseTitle) {
        return undefined;
      }

      return {
        title: portugueseTitle,
        year: releaseYear,
        posterUrl,
        index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)
    .map(({ title, year, posterUrl }) => ({ title, year, posterUrl }));

  if (!parsed.length) {
    throw new Error('Nenhum filme válido encontrado no arquivo Excel.');
  }

  cachedMovies = parsed;
  cachedWorkbookStat = { mtimeMs: stat.mtimeMs };
  return cachedMovies;
}

function asTrimmedString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function normalizeYear(value) {
  const yearNumber = Number.parseInt(value, 10);
  if (Number.isNaN(yearNumber)) {
    return undefined;
  }
  return yearNumber;
}

function normalizePosterUrl(value) {
  const url = asTrimmedString(value || '');
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch (error) {
    return undefined;
  }
}

function ensureMoviePosterColumn() {
  const columns = db.prepare('PRAGMA table_info(movies)').all();
  const hasPosterColumn = columns.some((column) => column.name === 'poster_url');
  if (!hasPosterColumn) {
    db.exec('ALTER TABLE movies ADD COLUMN poster_url TEXT');
  }
}

const getDb = () => initDatabase();

export { initDatabase, resetDatabase, getDb, closeDatabase };
