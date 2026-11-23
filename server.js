// Servidor HTTP: API em /api/* + arquivos estáticos da pasta public/. Sem dependências externas.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBanco } from './db.js';
import { criarPedido } from './compra.js';

const PORTA = process.env.PORT || 3000;
const PASTA_PUBLIC = dirname(fileURLToPath(import.meta.url));
// Só estes arquivos são servidos ao navegador (o resto, como server.js e o banco, fica privado).
const ARQUIVOS_PUBLICOS = new Set(['index.html', 'style.css', 'app.js', 'api.js', 'carrinho.js']);
const db = abrirBanco();

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

// ---------- utilidades ----------
function responderJson(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corpo));
}

function lerCorpoJson(req) {
  return new Promise((resolve, reject) => {
    let texto = '';
    req.on('data', (parte) => {
      texto += parte;
      if (texto.length > 10_000) reject(new Error('Corpo da requisição muito grande.'));
    });
    req.on('end', () => {
      try { resolve(texto ? JSON.parse(texto) : {}); }
      catch { reject(new Error('JSON inválido.')); }
    });
  });
}

// ---------- rotas da API ----------
const SQL_PRODUTOS = `
  SELECT p.id_produto, p.titulo, p.autor, p.genero, p.editora, p.preco,
         p.lancamento, p.capa_url, e.quantidade_disponivel
  FROM produtos p
  JOIN estoque e ON e.id_produto = p.id_produto`;

// GET /api/produtos?genero=Shonen&busca=one&lancamento=1
function listarProdutos(url) {
  const filtros = [];
  const valores = [];
  const genero = url.searchParams.get('genero');
  const busca = url.searchParams.get('busca');

  if (genero) { filtros.push('p.genero = ?'); valores.push(genero); }
  if (busca) { filtros.push('(p.titulo LIKE ? OR p.autor LIKE ?)'); valores.push(`%${busca}%`, `%${busca}%`); }
  if (url.searchParams.get('lancamento') === '1') filtros.push('p.lancamento = 1');

  const where = filtros.length ? ` WHERE ${filtros.join(' AND ')}` : '';
  return db.prepare(`${SQL_PRODUTOS}${where} ORDER BY p.titulo`).all(...valores);
}

async function tratarApi(req, res, url) {
  const { pathname } = url;

  if (req.method === 'GET' && pathname === '/api/produtos') {
    return responderJson(res, 200, listarProdutos(url));
  }

  const estoque = pathname.match(/^\/api\/produtos\/([\w-]+)\/estoque$/);
  if (req.method === 'GET' && estoque) {
    const linha = db.prepare('SELECT quantidade_disponivel FROM estoque WHERE id_produto = ?').get(estoque[1]);
    if (!linha) return responderJson(res, 404, { erro: 'Produto não encontrado.' });
    return responderJson(res, 200, { id_produto: estoque[1], quantidade_disponivel: linha.quantidade_disponivel });
  }

  if (req.method === 'POST' && pathname === '/api/pedidos') {
    const resultado = criarPedido(db, await lerCorpoJson(req));
    const { status, ...corpo } = resultado;
    return responderJson(res, status, corpo);
  }

  if (req.method === 'POST' && pathname === '/api/avisos') {
    const { id_produto, email } = await lerCorpoJson(req);
    if (!/^\S+@\S+\.\S+$/.test(email || '')) return responderJson(res, 400, { erro: 'Informe um e-mail válido.' });
    const existe = db.prepare('SELECT 1 FROM produtos WHERE id_produto = ?').get(id_produto);
    if (!existe) return responderJson(res, 404, { erro: 'Produto não encontrado.' });
    db.prepare('INSERT INTO avisos (id_produto, email) VALUES (?, ?)').run(id_produto, email);
    return responderJson(res, 201, { mensagem: 'Pronto! Avisaremos você quando este volume chegar.' });
  }

  responderJson(res, 404, { erro: 'Rota não encontrada.' });
}

// ---------- arquivos estáticos ----------
async function servirArquivo(res, pathname) {
  const nome = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!ARQUIVOS_PUBLICOS.has(nome)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Página não encontrada');
  }
  try {
    const conteudo = await readFile(join(PASTA_PUBLIC, nome));
    res.writeHead(200, { 'Content-Type': TIPOS[extname(nome)] || 'application/octet-stream' });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Página não encontrada');
  }
}

// ---------- servidor ----------
const servidor = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) await tratarApi(req, res, url);
    else await servirArquivo(res, decodeURIComponent(url.pathname));
  } catch (erro) {
    console.error(erro);
    const pedidoInvalido = erro.message === 'JSON inválido.' || erro.message.includes('muito grande');
    responderJson(res, pedidoInvalido ? 400 : 500, {
      erro: pedidoInvalido ? erro.message : 'Erro interno no servidor.',
    });
  }
});

servidor.listen(PORTA, () => console.log(`MangáStore rodando em http://localhost:${PORTA}`));
