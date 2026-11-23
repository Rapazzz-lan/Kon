// Testes da regra de compra, com banco em memória (não mexe no banco real).  Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirBanco } from './db.js';
import { criarPedido } from './compra.js';

const saldo = (db, id) =>
  db.prepare('SELECT quantidade_disponivel AS q FROM estoque WHERE id_produto = ?').get(id).q;
const totalPedidos = (db) => db.prepare('SELECT COUNT(*) AS n FROM pedidos').get().n;

test('compra válida registra o pedido e dá baixa no estoque', () => {
  const db = abrirBanco(':memory:');
  const r = criarPedido(db, { id_produto: 'MNG-001', quantidade: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.status, 201);
  assert.equal(r.pedido.status, 'aprovado');
  assert.equal(saldo(db, 'MNG-001'), 23); // 25 - 2
  assert.equal(totalPedidos(db), 1);
});

test('compra acima do saldo é bloqueada, sem pedido e sem baixa', () => {
  const db = abrirBanco(':memory:');
  const r = criarPedido(db, { id_produto: 'MNG-004', quantidade: 5 }); // só há 3
  assert.equal(r.ok, false);
  assert.equal(r.status, 409);
  assert.match(r.erro, /apenas 3 unidades/);
  assert.equal(saldo(db, 'MNG-004'), 3);
  assert.equal(totalPedidos(db), 0);
});

test('produto esgotado é bloqueado', () => {
  const db = abrirBanco(':memory:');
  const r = criarPedido(db, { id_produto: 'MNG-006', quantidade: 1 });
  assert.equal(r.status, 409);
  assert.match(r.erro, /esgotado/);
  assert.equal(saldo(db, 'MNG-006'), 0);
});

test('comprar exatamente o saldo zera o estoque e a compra seguinte é bloqueada', () => {
  const db = abrirBanco(':memory:');
  assert.equal(criarPedido(db, { id_produto: 'MNG-004', quantidade: 3 }).ok, true);
  assert.equal(saldo(db, 'MNG-004'), 0);
  assert.equal(criarPedido(db, { id_produto: 'MNG-004', quantidade: 1 }).status, 409);
});

test('quantidade inválida e produto inexistente', () => {
  const db = abrirBanco(':memory:');
  assert.equal(criarPedido(db, { id_produto: 'MNG-001', quantidade: 0 }).status, 400);
  assert.equal(criarPedido(db, { id_produto: 'MNG-001', quantidade: 1.5 }).status, 400);
  assert.equal(criarPedido(db, { id_produto: 'MNG-001', quantidade: -2 }).status, 400);
  assert.equal(criarPedido(db, { id_produto: 'XXX-999', quantidade: 1 }).status, 404);
});
