import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const currentFilePath = fileURLToPath(import.meta.url);
const db = getDb();

const statements = {
  listMovies: db.prepare(
    'SELECT id, title, year, poster_url AS posterUrl FROM movies ORDER BY id ASC'
  ),
  createParticipant: db.prepare('INSERT INTO participants (name) VALUES (?)'),
  findParticipant: db.prepare('SELECT id FROM participants WHERE id = ?'),
  findMovie: db.prepare('SELECT id FROM movies WHERE id = ?'),
  upsertResponse: db.prepare(`
    INSERT INTO responses (participant_id, movie_id, watched, remembered)
    VALUES (@participantId, @movieId, @watched, @remembered)
    ON CONFLICT(participant_id, movie_id)
    DO UPDATE SET
      watched = excluded.watched,
      remembered = excluded.remembered,
      updated_at = CURRENT_TIMESTAMP
  `),
};

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(path.dirname(currentFilePath), '../public')));

app.get('/api/movies', (_req, res) => {
  const movies = statements.listMovies.all();
  res.json({ movies });
});

app.post('/api/participants', (req, res) => {
  const rawName = typeof req.body.name === 'string' ? req.body.name.trim() : '';

  if (!rawName) {
    return res.status(400).json({ error: 'O nome é obrigatório.' });
  }

  const info = statements.createParticipant.run(rawName);
  res.status(201).json({ participantId: info.lastInsertRowid });
});

app.post('/api/responses', (req, res) => {
  const { participantId, movieId, watched, remembered } = req.body;

  if (!Number.isInteger(participantId) || participantId <= 0) {
    return res.status(400).json({ error: 'participantId precisa ser um inteiro positivo.' });
  }

  if (!Number.isInteger(movieId) || movieId <= 0) {
    return res.status(400).json({ error: 'movieId precisa ser um inteiro positivo.' });
  }

  if (typeof watched !== 'boolean' || typeof remembered !== 'boolean') {
    return res.status(400).json({ error: 'watched e remembered devem ser valores booleanos.' });
  }

  const participantExists = statements.findParticipant.get(participantId);
  if (!participantExists) {
    return res.status(404).json({ error: 'Participante não encontrado.' });
  }

  const movieExists = statements.findMovie.get(movieId);
  if (!movieExists) {
    return res.status(404).json({ error: 'Filme não encontrado.' });
  }

  statements.upsertResponse.run({
    participantId,
    movieId,
    watched: watched ? 1 : 0,
    remembered: remembered ? 1 : 0,
  });

  res.status(201).json({ success: true });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (process.argv[1] === currentFilePath) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
