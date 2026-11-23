-- MangáStore: esquema do banco (SQLite)
-- Observação: SQLite não tem DECIMAL "de verdade"; o tipo é aceito e tratado como número.

CREATE TABLE produtos (
  id_produto  TEXT PRIMARY KEY,                       -- ex.: MNG-001
  titulo      TEXT NOT NULL,                          -- ex.: One Piece - Vol. 01
  autor       TEXT NOT NULL,
  genero      TEXT NOT NULL CHECK (genero IN ('Shonen', 'Seinen', 'Shojo')),
  editora     TEXT NOT NULL,
  preco       DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
  lancamento  INTEGER NOT NULL DEFAULT 0,             -- 1 = aparece em "Lançamentos da Semana"
  capa_url    TEXT                                    -- opcional; sem ela o site mostra uma capa gerada por CSS
);

CREATE TABLE estoque (
  id_estoque            INTEGER PRIMARY KEY AUTOINCREMENT,
  id_produto            TEXT NOT NULL UNIQUE REFERENCES produtos (id_produto),
  quantidade_disponivel INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_disponivel >= 0),  -- rede de segurança: nunca fica negativo
  localizacao           TEXT                          -- ex.: Corredor B - Estante 03
);

CREATE TABLE pedidos (
  id_pedido           INTEGER PRIMARY KEY AUTOINCREMENT,
  id_produto          TEXT NOT NULL REFERENCES produtos (id_produto),
  quantidade_comprada INTEGER NOT NULL CHECK (quantidade_comprada > 0),
  status              TEXT NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('pendente', 'aprovado', 'enviado', 'cancelado')),
  data_pedido         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Extra: guarda os pedidos de "Avise-me quando chegar"
CREATE TABLE avisos (
  id_aviso   INTEGER PRIMARY KEY AUTOINCREMENT,
  id_produto TEXT NOT NULL REFERENCES produtos (id_produto),
  email      TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);
