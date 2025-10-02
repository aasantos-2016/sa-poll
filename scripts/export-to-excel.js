#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');

const DEFAULT_DB_PATH = path.join(__dirname, '../data/poll.db');
const OUTPUT_PATH = path.join(__dirname, '../data/poll-export.xlsx');
const DB_PATH = process.env.DB_PATH ? path.resolve(process.cwd(), process.env.DB_PATH) : DEFAULT_DB_PATH;

if (!fs.existsSync(DB_PATH)) {
  console.error(`Banco de dados não encontrado em ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

try {
  const rows = db
    .prepare(`
      SELECT
        p.name AS participante,
        m.title AS filme,
        COALESCE(r.watched, 0) AS assistiu,
        COALESCE(r.remembered, 0) AS lembra,
        r.created_at AS respondido_em,
        m.year AS ano,
        m.poster_url AS poster
      FROM responses r
      JOIN participants p ON p.id = r.participant_id
      JOIN movies m ON m.id = r.movie_id
      ORDER BY p.name, m.id
    `)
    .all();

  if (!rows.length) {
    console.log('Nenhuma resposta encontrada na base.');
    process.exit(0);
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');

  XLSX.writeFile(workbook, OUTPUT_PATH);
  console.log(`Exportação concluída: ${OUTPUT_PATH}`);
} catch (error) {
  console.error('Falha ao exportar dados:', error.message);
  process.exit(1);
} finally {
  db.close();
}
