-- Dados de teste (títulos reais, mas editoras/preços/estoques são fictícios)
INSERT INTO produtos (id_produto, titulo, autor, genero, editora, preco, lancamento) VALUES
  ('MNG-001', 'One Piece - Vol. 01',        'Eiichiro Oda',     'Shonen', 'Panini', 34.90, 1),
  ('MNG-002', 'One Piece - Vol. 02',        'Eiichiro Oda',     'Shonen', 'Panini', 34.90, 1),
  ('MNG-003', 'Naruto - Vol. 01',           'Masashi Kishimoto','Shonen', 'Panini', 32.90, 0),
  ('MNG-004', 'Jujutsu Kaisen - Vol. 01',   'Gege Akutami',     'Shonen', 'JBC',    36.90, 1),
  ('MNG-005', 'Berserk - Vol. 01',          'Kentaro Miura',    'Seinen', 'Panini', 49.90, 1),
  ('MNG-006', 'Berserk - Vol. 02',          'Kentaro Miura',    'Seinen', 'Panini', 49.90, 1),
  ('MNG-007', 'Vagabond - Vol. 01',         'Takehiko Inoue',   'Seinen', 'Panini', 54.90, 0),
  ('MNG-008', 'Monster - Vol. 01',          'Naoki Urasawa',    'Seinen', 'Panini', 44.90, 0),
  ('MNG-009', 'Fruits Basket - Vol. 01',    'Natsuki Takaya',   'Shojo',  'JBC',    33.90, 1),
  ('MNG-010', 'Sailor Moon - Vol. 01',      'Naoko Takeuchi',   'Shojo',  'JBC',    39.90, 0),
  ('MNG-011', 'Ao Haru Ride - Vol. 01',     'Io Sakisaka',      'Shojo',  'Panini', 29.90, 0);

-- Repare: MNG-004 tem pouco estoque (3) e MNG-006 está esgotado (0), para testar os avisos.
INSERT INTO estoque (id_produto, quantidade_disponivel, localizacao) VALUES
  ('MNG-001', 25, 'Corredor A - Estante 01'),
  ('MNG-002', 18, 'Corredor A - Estante 01'),
  ('MNG-003', 12, 'Corredor A - Estante 02'),
  ('MNG-004',  3, 'Corredor A - Estante 03'),
  ('MNG-005',  8, 'Corredor B - Estante 01'),
  ('MNG-006',  0, 'Corredor B - Estante 01'),
  ('MNG-007',  5, 'Corredor B - Estante 02'),
  ('MNG-008',  6, 'Corredor B - Estante 03'),
  ('MNG-009', 10, 'Corredor C - Estante 01'),
  ('MNG-010',  7, 'Corredor C - Estante 02'),
  ('MNG-011',  9, 'Corredor C - Estante 03');
