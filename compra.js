// Regra de negócio da compra. Não conhece HTTP: recebe dados e devolve um resultado simples.
// Resultado: { ok: true, status: 201, pedido } ou { ok: false, status, erro, ... }

// Pagamento simulado. Em produção, aqui entraria a integração (Pix, cartão...).
function processarPagamento() {
  return { aprovado: true };
}

function textoDeEstoque(titulo, disponivel) {
  if (disponivel === 0) return `Desculpe, "${titulo}" está esgotado no momento.`;
  const unidades = disponivel === 1 ? '1 unidade' : `${disponivel} unidades`;
  return `Desculpe, temos apenas ${unidades} deste volume disponíveis em estoque.`;
}

export function criarPedido(db, { id_produto, quantidade }) {
  const qtd = Number(quantidade);
  if (!id_produto || !Number.isInteger(qtd) || qtd < 1) {
    return { ok: false, status: 400, erro: 'Informe um produto e uma quantidade inteira maior que zero.' };
  }

  // BEGIN IMMEDIATE trava a escrita: duas compras simultâneas não "furam" o estoque.
  db.exec('BEGIN IMMEDIATE');
  try {
    // 1) Consulta de saldo
    const item = db
      .prepare(`SELECT p.titulo, e.quantidade_disponivel
                FROM produtos p JOIN estoque e ON e.id_produto = p.id_produto
                WHERE p.id_produto = ?`)
      .get(id_produto);

    if (!item) {
      db.exec('ROLLBACK');
      return { ok: false, status: 404, erro: 'Produto não encontrado.' };
    }
    if (item.quantidade_disponivel < qtd) {
      db.exec('ROLLBACK');
      return {
        ok: false,
        status: 409,
        erro: textoDeEstoque(item.titulo, item.quantidade_disponivel),
        disponivel: item.quantidade_disponivel,
      };
    }

    // 2) Validação de pagamento
    if (!processarPagamento().aprovado) {
      db.exec('ROLLBACK');
      return { ok: false, status: 402, erro: 'Pagamento não aprovado.' };
    }

    // 3) Registro do pedido
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO pedidos (id_produto, quantidade_comprada, status) VALUES (?, ?, 'aprovado')`)
      .run(id_produto, qtd);

    // 4) Baixa de estoque (o WHERE garante que nunca fica negativo)
    const baixa = db
      .prepare(`UPDATE estoque
                SET quantidade_disponivel = quantidade_disponivel - ?
                WHERE id_produto = ? AND quantidade_disponivel >= ?`)
      .run(qtd, id_produto, qtd);
    if (baixa.changes !== 1) throw new Error('Falha ao dar baixa no estoque.');

    db.exec('COMMIT');
    return {
      ok: true,
      status: 201,
      pedido: {
        id_pedido: Number(lastInsertRowid),
        id_produto,
        titulo: item.titulo,
        quantidade_comprada: qtd,
        status: 'aprovado',
      },
    };
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}
