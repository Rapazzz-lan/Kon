// Abre o banco SQLite. Se for a primeira execução, cria as tabelas e os dados de teste.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PASTA_DATABASE = dirname(fileURLToPath(import.meta.url));
export const ARQUIVO_DO_BANCO = join(PASTA_DATABASE, 'mangastore.db');

export function abrirBanco(caminho = ARQUIVO_DO_BANCO) {
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA foreign_keys = ON');

  const jaTemTabelas = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'produtos'")
    .get();

  if (!jaTemTabelas) {
    db.exec(readFileSync(join(PASTA_DATABASE, 'schema.sql'), 'utf8'));
    db.exec(readFileSync(join(PASTA_DATABASE, 'seed.sql'), 'utf8'));
  }
  return db;
}
