process.env.DB_PATH = ':memory:';

const request = require('supertest');
const app = require('../server/index');
const { resetDatabase, closeDatabase, getDb } = require('../server/db');

beforeEach(() => {
  resetDatabase();
});

afterAll(() => {
  closeDatabase();
});

describe('Movie poll API', () => {
  test('GET /api/movies returns the seeded list', async () => {
    const response = await request(app).get('/api/movies');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.movies)).toBe(true);
    expect(response.body.movies.length).toBeGreaterThan(0);
    expect(response.body.movies[0]).toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
    });
    expect(response.body.movies[0]).toHaveProperty('posterUrl');
  });

  test('POST /api/participants creates a participant', async () => {
    const response = await request(app)
      .post('/api/participants')
      .send({ name: 'Jordan' });

    expect(response.status).toBe(201);
    expect(response.body.participantId).toEqual(expect.any(Number));
  });

  test('POST /api/participants validates name input', async () => {
    const response = await request(app)
      .post('/api/participants')
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  test('POST /api/responses stores questionnaire answers', async () => {
    const participantRes = await request(app)
      .post('/api/participants')
      .send({ name: 'Casey' });

    const participantId = participantRes.body.participantId;

    const moviesRes = await request(app).get('/api/movies');
    const movie = moviesRes.body.movies[0];

    const response = await request(app)
      .post('/api/responses')
      .send({
        participantId,
        movieId: movie.id,
        watched: true,
        remembered: false,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const db = getDb();
    const saved = db
      .prepare('SELECT watched, remembered FROM responses WHERE participant_id = ? AND movie_id = ?')
      .get(participantId, movie.id);

    expect(saved).toMatchObject({ watched: 1, remembered: 0 });
  });

  test('POST /api/responses rejects invalid payloads', async () => {
    const participantRes = await request(app)
      .post('/api/participants')
      .send({ name: 'Taylor' });

    const participantId = participantRes.body.participantId;
    const moviesRes = await request(app).get('/api/movies');
    const movie = moviesRes.body.movies[0];

    const response = await request(app)
      .post('/api/responses')
      .send({
        participantId,
        movieId: movie.id,
        watched: 'yes',
        remembered: false,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
