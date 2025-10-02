#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const fetchFn = globalThis.fetch?.bind(globalThis);

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error('Defina a variável de ambiente TMDB_API_KEY antes de executar este script.');
  process.exit(1);
}

if (!fetchFn) {
  console.error('Este script requer suporte a fetch nativo no Node.js 20+.');
  process.exit(1);
}

const currentDirPath = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK_PATH = path.join(currentDirPath, '../data/filmes_natal_BR_40-50_RT.xlsx');
if (!fs.existsSync(WORKBOOK_PATH)) {
  console.error(`Arquivo não encontrado: ${WORKBOOK_PATH}`);
  process.exit(1);
}

const workbook = XLSX.readFile(WORKBOOK_PATH);
const [sheetName] = workbook.SheetNames;
if (!sheetName) {
  console.error('Nenhuma aba encontrada na planilha.');
  process.exit(1);
}

const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
if (rows.length === 0) {
  console.log('Planilha vazia, nada a atualizar.');
  process.exit(0);
}

const headers = rows[0];
let posterColIndex = headers.findIndex((header) =>
  header && header.toString().toLowerCase().includes('poster')
);
if (posterColIndex === -1) {
  posterColIndex = headers.length;
  headers.push('Poster URL');
}

const titlePtIndex = headers.findIndex((header) => header === 'Nome do filme (PT-BR)');
const originalTitleIndex = headers.findIndex((header) => header === 'Nome Original');
const yearIndex = headers.findIndex((header) => header === 'Ano de Lançamento');

if (titlePtIndex === -1 && originalTitleIndex === -1) {
  console.error('Não foi possível localizar as colunas de título na planilha.');
  process.exit(1);
}

let updatedCount = 0;

const TMDB_IMAGE_BASE = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/w500';

function buildSearchUrl(title, year) {
  const url = new URL('https://api.themoviedb.org/3/search/movie');
  url.searchParams.set('query', title);
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('language', 'pt-BR');
  if (year) {
    url.searchParams.set('primary_release_year', year);
  }
  return url;
}

async function fetchPoster(title, year) {
  const url = buildSearchUrl(title, year);

  const response = await fetchFn(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar TMDB: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const [firstResult] = payload.results || [];

  if (firstResult && firstResult.poster_path) {
    return `${TMDB_IMAGE_BASE}${firstResult.poster_path}`;
  }

  return undefined;
}

(async () => {
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row) continue;

    const currentPoster = (row[posterColIndex] || '').toString().trim();
    if (currentPoster) {
      continue;
    }

    const originalTitle = (row[originalTitleIndex] || '').toString().trim();
    const portugueseTitle = (row[titlePtIndex] || '').toString().trim();
    const year = (row[yearIndex] || '').toString().trim();
    const lookupTitle = originalTitle || portugueseTitle;

    if (!lookupTitle) {
      continue;
    }

    try {
      const posterUrl = await fetchPoster(lookupTitle, year);
      if (posterUrl) {
        row[posterColIndex] = posterUrl;
        updatedCount += 1;
        console.log(`✔️  Atualizado: ${lookupTitle} (${year || 's/ano'})`);
      } else {
        console.log(`⚠️  Nenhum pôster encontrado para ${lookupTitle} (${year || 's/ano'})`);
      }
    } catch (error) {
      console.error(`Erro ao buscar pôster de ${lookupTitle}:`, error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  if (updatedCount > 0) {
    const newSheet = XLSX.utils.aoa_to_sheet(rows);
    workbook.Sheets[sheetName] = newSheet;
    XLSX.writeFile(workbook, WORKBOOK_PATH);
    console.log(`\nConcluído. ${updatedCount} pôster(es) adicionados na planilha.`);
  } else {
    console.log('\nNenhum pôster atualizado.');
  }
})();
