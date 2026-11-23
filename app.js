// Interface da MangáStore: catálogo, filtros, busca, carrinho, avisos e assinatura.
import { listarProdutos, criarPedido, pedirAviso } from './api.js';
import * as carrinho from './carrinho.js';

// ---------- utilidades ----------
const $ = (seletor) => document.querySelector(seletor);
const brl = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nomeDaObra = (titulo) => titulo.split(' - Vol.')[0];

// Cria elementos sem innerHTML (evita injeção de HTML vinda dos dados).
function el(tag, propriedades = {}, ...filhos) {
  const elemento = document.createElement(tag);
  Object.assign(elemento, propriedades);
  elemento.append(...filhos);
  return elemento;
}

// ---------- estado do catálogo ----------
const estado = { modo: 'lancamentos', genero: null, obra: null, busca: '' };
let produtos = [];
let versaoDaBusca = 0; // evita que uma resposta antiga sobrescreva uma mais nova

async function carregarCatalogo() {
  const minhaVersao = ++versaoDaBusca;
  let filtros = { lancamento: 1 };
  let titulo = 'Lançamentos da Semana';

  if (estado.modo === 'genero') { filtros = { genero: estado.genero }; titulo = estado.genero; }
  if (estado.modo === 'busca') { filtros = { busca: estado.busca }; titulo = `Resultados para “${estado.busca}”`; }

  $('#titulo-grade').textContent = titulo;
  $('#status').textContent = 'Carregando…';

  const resposta = await listarProdutos(filtros);
  if (minhaVersao !== versaoDaBusca) return; // chegou depois de uma busca mais nova

  if (!resposta.ok) {
    produtos = [];
    $('#status').textContent = resposta.dados.erro || 'Erro ao carregar os mangás.';
    $('#filtro-obras').hidden = true;
    $('#grade').replaceChildren();
    return;
  }
  produtos = resposta.dados;
  desenharObras();
  desenharGrade();
}

function marcarGeneroAtivo() {
  document.querySelectorAll('#filtro-generos .chip').forEach((botao) => {
    const ativo = estado.modo !== 'busca' && (botao.dataset.genero || null) === estado.genero;
    botao.classList.toggle('ativo', ativo);
    botao.setAttribute('aria-pressed', String(ativo));
  });
}

// Botões de obra (clique 2): aparecem quando um gênero está selecionado.
function desenharObras() {
  const caixa = $('#filtro-obras');
  caixa.replaceChildren();
  caixa.hidden = estado.modo !== 'genero';
  if (caixa.hidden) return;

  const obras = [...new Set(produtos.map((p) => nomeDaObra(p.titulo)))];
  const botao = (texto, obra) => {
    const ativo = estado.obra === obra;
    return el('button', {
      type: 'button', className: ativo ? 'chip ativo' : 'chip', textContent: texto,
      onclick: () => { estado.obra = obra; desenharObras(); desenharGrade(); },
    });
  };
  caixa.append(botao('Todas as obras', null), ...obras.map((o) => botao(o, o)));
}

function desenharGrade() {
  const grade = $('#grade');
  grade.replaceChildren();
  const visiveis = estado.obra ? produtos.filter((p) => nomeDaObra(p.titulo) === estado.obra) : produtos;

  $('#status').textContent = visiveis.length === 0 ? 'Nenhum mangá encontrado.' : '';
  visiveis.forEach((p) => grade.append(criarCard(p)));
}

// ---------- card de produto ----------
function criarCard(p) {
  const capa = p.capa_url
    ? el('img', { className: 'capa', src: p.capa_url, alt: `Capa de ${p.titulo}`, loading: 'lazy' })
    : el('div', { className: `capa capa-${p.genero.toLowerCase()}`, ariaLabel: `Capa de ${p.titulo}` }, nomeDaObra(p.titulo));

  const disponivel = p.quantidade_disponivel;
  let textoEstoque = `${disponivel} em estoque`;
  let classeEstoque = 'card__estoque';
  if (disponivel === 0) { textoEstoque = 'Esgotado'; classeEstoque += ' card__estoque--zero'; }
  else if (disponivel <= 5) { textoEstoque = `Restam só ${disponivel}!`; classeEstoque += ' card__estoque--pouco'; }

  const mensagem = el('p', { className: 'card__mensagem', role: 'alert' });
  const corpo = el('div', { className: 'card__corpo' },
    el('h3', { className: 'card__titulo', textContent: p.titulo }),
    el('p', { className: 'card__meta', textContent: `${p.autor} • ${p.editora}` }),
    el('p', { className: 'card__preco', textContent: brl(p.preco) }),
    el('p', { className: classeEstoque, textContent: textoEstoque }),
    mensagem,
  );

  if (disponivel === 0) {
    // Sem saldo: oferece o aviso em vez de comprar.
    corpo.append(el('button', {
      type: 'button', className: 'btn btn--largo', textContent: 'Avise-me quando chegar',
      onclick: () => abrirAviso(p),
    }));
  } else {
    const campoQtd = el('input', { type: 'number', min: 1, max: disponivel, value: 1, ariaLabel: `Quantidade de ${p.titulo}` });
    // O seletor nunca passa do saldo real.
    campoQtd.addEventListener('input', () => {
      if (Number(campoQtd.value) > disponivel) {
        campoQtd.value = disponivel;
        mensagem.textContent = `Desculpe, temos apenas ${disponivel} unidade(s) deste volume disponíveis em estoque.`;
      } else {
        mensagem.textContent = '';
      }
    });
    const botaoComprar = el('button', {
      type: 'button', className: 'btn', textContent: 'Comprar',
      onclick: () => {
        const quantidade = Number(campoQtd.value);
        if (!Number.isInteger(quantidade) || quantidade < 1) { mensagem.textContent = 'Informe uma quantidade válida.'; return; }
        const resultado = carrinho.adicionar(p, quantidade);
        if (!resultado.ok) { mensagem.textContent = resultado.erro; return; }
        mensagem.textContent = '';
        atualizarContador();
        abrirCarrinho();
      },
    });
    corpo.append(el('div', { className: 'card__compra' }, campoQtd, botaoComprar));
  }
  return el('article', { className: 'card' }, capa, corpo);
}

// ---------- carrinho ----------
const dialogCarrinho = $('#dialog-carrinho');

function atualizarContador() {
  $('#contador-carrinho').textContent = carrinho.quantidadeTotal();
}

function desenharCarrinho() {
  const itens = carrinho.ler();
  const lista = $('#lista-carrinho');
  lista.replaceChildren();

  if (itens.length === 0) lista.append(el('li', { className: 'vazio', textContent: 'Seu carrinho está vazio.' }));
  itens.forEach((item) => lista.append(el('li', {},
    el('span', { textContent: `${item.qtd}× ${item.titulo}` }),
    el('strong', { textContent: brl(item.preco * item.qtd) }),
    el('button', {
      type: 'button', className: 'btn-link', textContent: 'Remover',
      onclick: () => { carrinho.remover(item.id); atualizarContador(); desenharCarrinho(); },
    }),
  )));

  $('#total-carrinho').textContent = itens.length ? `Total: ${brl(carrinho.valorTotal())}` : '';
  $('#btn-finalizar').disabled = itens.length === 0;
}

function abrirCarrinho() {
  $('#mensagens-carrinho').replaceChildren();
  desenharCarrinho();
  if (!dialogCarrinho.open) dialogCarrinho.showModal();
}

// Cada item vira um pedido. Os aprovados saem do carrinho; os recusados ficam, com a mensagem do servidor.
async function finalizarCompra() {
  const botao = $('#btn-finalizar');
  const caixa = $('#mensagens-carrinho');
  botao.disabled = true;
  caixa.replaceChildren();

  for (const item of carrinho.ler()) {
    const resposta = await criarPedido(item.id, item.qtd);
    if (resposta.ok) {
      carrinho.remover(item.id);
      caixa.append(el('p', { className: 'msg-ok', textContent: `✔ Pedido #${resposta.dados.pedido.id_pedido} aprovado: ${item.qtd}× ${item.titulo}.` }));
    } else {
      caixa.append(el('p', { className: 'msg-erro', textContent: `✖ ${item.titulo}: ${resposta.dados.erro}` }));
    }
  }

  atualizarContador();
  desenharCarrinho();
  carregarCatalogo(); // o estoque mudou: atualiza os cards
}

// ---------- "Avise-me quando chegar" ----------
let produtoDoAviso = null;

function abrirAviso(produto) {
  produtoDoAviso = produto;
  $('#aviso-produto').textContent = `Vamos avisar quando "${produto.titulo}" voltar ao estoque.`;
  $('#mensagem-aviso').textContent = '';
  $('#dialog-aviso').showModal();
}

$('#form-aviso').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const mensagem = $('#mensagem-aviso');
  const resposta = await pedirAviso(produtoDoAviso.id_produto, $('#aviso-email').value.trim());
  mensagem.className = resposta.ok ? 'mensagens msg-ok' : 'mensagens msg-erro';
  mensagem.textContent = resposta.ok ? resposta.dados.mensagem : resposta.dados.erro;
});

// ---------- assinatura (checkout demonstrativo) ----------
let planoEscolhido = null;

document.querySelectorAll('[data-plano]').forEach((botao) => {
  botao.addEventListener('click', () => {
    planoEscolhido = { nome: botao.dataset.plano, preco: botao.dataset.preco };
    $('#resumo-assinatura').textContent = `Plano ${planoEscolhido.nome} — R$ ${planoEscolhido.preco}/mês.`;
    $('#mensagem-assinatura').textContent = '';
    $('#btn-confirmar-assinatura').disabled = false;
    $('#dialog-assinatura').showModal();
  });
});

$('#btn-confirmar-assinatura').addEventListener('click', (evento) => {
  evento.target.disabled = true;
  const mensagem = $('#mensagem-assinatura');
  mensagem.className = 'mensagens msg-ok';
  mensagem.textContent = `Plano ${planoEscolhido.nome} selecionado! (Demonstração: a cobrança recorrente ainda não está implementada.)`;
});

// ---------- eventos gerais ----------
$('#filtro-generos').addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-genero]');
  if (!botao) return;
  $('#campo-busca').value = '';
  const genero = botao.dataset.genero;
  Object.assign(estado, genero
    ? { modo: 'genero', genero, obra: null, busca: '' }
    : { modo: 'lancamentos', genero: null, obra: null, busca: '' });
  marcarGeneroAtivo();
  carregarCatalogo();
});

$('#link-lancamentos').addEventListener('click', () => {
  $('#campo-busca').value = '';
  Object.assign(estado, { modo: 'lancamentos', genero: null, obra: null, busca: '' });
  marcarGeneroAtivo();
  carregarCatalogo();
});

// Busca em tempo real (com pequena espera para não chamar a API a cada tecla).
let temporizadorDaBusca;
$('#campo-busca').addEventListener('input', (evento) => {
  clearTimeout(temporizadorDaBusca);
  temporizadorDaBusca = setTimeout(() => {
    const texto = evento.target.value.trim();
    Object.assign(estado, texto
      ? { modo: 'busca', busca: texto, genero: null, obra: null }
      : { modo: 'lancamentos', busca: '', genero: null, obra: null });
    marcarGeneroAtivo();
    carregarCatalogo();
  }, 300);
});
$('#form-busca').addEventListener('submit', (evento) => {
  evento.preventDefault();
  $('#catalogo').scrollIntoView();
});

$('#btn-carrinho').addEventListener('click', abrirCarrinho);
$('#btn-finalizar').addEventListener('click', finalizarCompra);

// Fecha qualquer dialog pelo "×"/botões [data-fechar] ou clicando no fundo escuro.
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (evento) => {
    if (evento.target === dialog || evento.target.closest('[data-fechar]')) dialog.close();
  });
});

// ---------- início ----------
atualizarContador();
carregarCatalogo();
