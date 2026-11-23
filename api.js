// Fala com a API do servidor. Sempre devolve { ok, status, dados } (nunca lança erro).
async function requisitar(url, opcoes) {
  try {
    const resposta = await fetch(url, opcoes);
    const dados = await resposta.json().catch(() => ({}));
    return { ok: resposta.ok, status: resposta.status, dados };
  } catch {
    return { ok: false, status: 0, dados: { erro: 'Não foi possível conectar ao servidor. Tente novamente.' } };
  }
}

function enviarJson(url, corpo) {
  return requisitar(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
}

export const listarProdutos = (filtros = {}) => requisitar('/api/produtos?' + new URLSearchParams(filtros));
export const criarPedido = (id_produto, quantidade) => enviarJson('/api/pedidos', { id_produto, quantidade });
export const pedirAviso = (id_produto, email) => enviarJson('/api/avisos', { id_produto, email });
