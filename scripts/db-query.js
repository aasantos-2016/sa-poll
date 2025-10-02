#!/usr/bin/env node
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(__dirname, '../data/poll.db');
const dbPathEnv = process.env.DB_PATH ? path.resolve(process.cwd(), process.env.DB_PATH) : DEFAULT_DB_PATH;

const [, , ...rest] = process.argv;
const query = rest.length ? rest.join(' ') : "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;";

try {
  const db = new Database(dbPathEnv, { readonly: true });
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    console.error('Forneça uma consulta SQL válida.');
    process.exit(1);
  }

  const stmt = db.prepare(trimmedQuery);

  if (/^\s*(select|pragma)/i.test(trimmedQuery)) {
    const rows = stmt.all();
    if (!rows.length) {
      console.log('Sem resultados.');
    } else {
      console.table(rows);
    }
  } else {
    const info = stmt.run();
    console.log('Comando executado com sucesso:', info);
  }

  db.close();
} catch (error) {
  console.error('Erro ao executar consulta:', error.message);
  process.exit(1);
}
