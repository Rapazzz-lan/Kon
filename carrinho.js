// Carrinho guardado no localStorage. O servidor sempre revalida o estoque na hora de comprar.
const CHAVE = 'mangastore-carrinho';

export function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || []; }
  catch { return []; }
}

function salvar(itens) {
  try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch { /* sem armazenamento: segue sem salvar */ }
}

// Adiciona respeitando o saldo do estoque. Devolve { ok } ou { ok: false, erro }.
export function adicionar(produto, quantidade) {
  const itens = ler();
  const existente = itens.find((i) => i.id === produto.id_produto);
  const jaNoCarrinho = existente ? existente.qtd : 0;

  if (jaNoCarrinho + quantidade > produto.quantidade_disponivel) {
    const restante = produto.quantidade_disponivel - jaNoCarrinho;
    return {
      ok: false,
      erro: restante > 0
        ? `Desculpe, temos apenas ${produto.quantidade_disponivel} unidades deste volume disponíveis em estoque (você já tem ${jaNoCarrinho} no carrinho).`
        : `Você já colocou no carrinho todas as ${produto.quantidade_disponivel} unidades disponíveis.`,
    };
  }

  if (existente) existente.qtd += quantidade;
  else itens.push({ id: produto.id_produto, titulo: produto.titulo, preco: produto.preco, qtd: quantidade });
  salvar(itens);
  return { ok: true };
}

export function remover(id) { salvar(ler().filter((i) => i.id !== id)); }
export function quantidadeTotal() { return ler().reduce((soma, i) => soma + i.qtd, 0); }
export function valorTotal() { return ler().reduce((soma, i) => soma + i.preco * i.qtd, 0); }
