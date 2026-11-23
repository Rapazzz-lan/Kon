// Apaga o banco e recria do zero (tabelas + dados de teste).  Uso: npm run db:reset
import { rmSync } from 'node:fs';
import { abrirBanco, ARQUIVO_DO_BANCO } from './db.js';

rmSync(ARQUIVO_DO_BANCO, { force: true });
abrirBanco().close();
console.log('Banco recriado com sucesso:', ARQUIVO_DO_BANCO);
