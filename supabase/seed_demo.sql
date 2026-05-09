-- ══════════════════════════════════════════════════════════════════════════════
-- SEED DE DEMONSTRAÇÃO — LegalFlow
-- Execute no: https://supabase.com/dashboard/project/sfkubeshpehrzurlgwex/sql/new
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. CLIENTES ───────────────────────────────────────────────────────────────
INSERT INTO public.clientes (id, user_id, nome, cpf, email, telefone)
SELECT
  gen_random_uuid(), u.id,
  v.nome, v.cpf, v.email, v.telefone
FROM auth.users u
CROSS JOIN (VALUES
  ('Roberto Alves Souza',    '382.910.450-12', 'roberto.souza@email.com',    '(11) 98741-3302'),
  ('Ana Clara Mendonça',     '219.874.560-33', 'ana.mendonca@email.com',     '(21) 97654-8821'),
  ('Carlos Eduardo Pinheiro','541.203.870-44', 'carlos.pinheiro@email.com',  '(31) 99123-5500'),
  ('Mariana Rodrigues Lima', '674.512.930-77', 'mariana.lima@email.com',     '(11) 94567-2210'),
  ('Fernanda Costa Barbosa', '193.485.720-55', 'fernanda.barbosa@email.com', '(41) 98302-7741')
) AS v(nome, cpf, email, telefone)
WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;


-- ── 2. PROCESSOS ─────────────────────────────────────────────────────────────
INSERT INTO public.processos (id, user_id, cliente_id, numero, tipo, status, valor, vara, comarca)
SELECT
  gen_random_uuid(),
  u.id,
  c.id,
  v.numero, v.tipo, v.status, v.valor::numeric, v.vara, v.comarca
FROM auth.users u
CROSS JOIN (VALUES
  ('Roberto Alves Souza',    '0012345-78.2024.8.26.0100', 'trabalhista',   'em_andamento', '45000', '3ª Vara do Trabalho',    'São Paulo'),
  ('Ana Clara Mendonça',     '0098712-14.2024.8.26.0050', 'civil',         'em_andamento', '28000', '5ª Vara Cível',          'Rio de Janeiro'),
  ('Carlos Eduardo Pinheiro','0074231-55.2023.8.26.0200', 'previdenciario','em_andamento', '15000', '2ª Vara Previdenciária', 'Belo Horizonte'),
  ('Mariana Rodrigues Lima', '0033498-21.2024.8.26.0300', 'familia',       'em_andamento', '0',     '1ª Vara de Família',     'São Paulo'),
  ('Fernanda Costa Barbosa', '0011874-63.2022.8.26.0500', 'criminal',      'arquivado',    '0',     'Vara Criminal',          'Curitiba')
) AS v(cliente_nome, numero, tipo, status, valor, vara, comarca)
JOIN public.clientes c ON c.user_id = u.id AND c.nome = v.cliente_nome
WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;


-- ── 3. ANDAMENTOS PROCESSUAIS ────────────────────────────────────────────────
INSERT INTO public.andamentos_processuais (processo_id, user_id, data, tipo, descricao)
SELECT
  p.id, u.id,
  v.data::date, v.tipo, v.descricao
FROM auth.users u
CROSS JOIN (VALUES
  ('0012345-78.2024.8.26.0100','2024-03-10','distribuicao','Processo distribuído à 3ª Vara do Trabalho de São Paulo.'),
  ('0012345-78.2024.8.26.0100','2024-04-22','audiencia',   'Audiência de conciliação realizada. Proposta de acordo de R$ 20.000 recusada pelo reclamado.'),
  ('0012345-78.2024.8.26.0100','2024-07-08','decisao',     'Despacho determinando produção de prova testemunhal. Audiência de instrução designada para 15/10/2024.'),
  ('0012345-78.2024.8.26.0100','2024-10-15','audiencia',   'Audiência de instrução realizada. Ouvidas 3 testemunhas. Processo concluso para sentença.'),
  ('0098712-14.2024.8.26.0050','2024-01-15','distribuicao','Ação de indenização por danos morais e materiais distribuída.'),
  ('0098712-14.2024.8.26.0050','2024-02-28','despacho',    'Citação do réu deferida. Prazo de 15 dias para contestação.'),
  ('0098712-14.2024.8.26.0050','2024-04-10','decisao',     'Contestação apresentada pelo réu. Vista à parte autora para réplica.'),
  ('0074231-55.2023.8.26.0200','2023-11-05','distribuicao','Ação de concessão de aposentadoria por invalidez distribuída.'),
  ('0074231-55.2023.8.26.0200','2024-01-20','pericia',     'Laudo pericial médico apresentado. Médico perito atesta incapacidade total e permanente.'),
  ('0074231-55.2023.8.26.0200','2024-05-14','sentenca',    'Sentença procedente. INSS condenado a conceder aposentadoria por invalidez com DIB desde o requerimento.')
) AS v(numero, data, tipo, descricao)
JOIN public.processos p ON p.user_id = u.id AND p.numero = v.numero
WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;


-- ── 4. PRAZOS ────────────────────────────────────────────────────────────────
INSERT INTO public.prazos (user_id, processo_id, titulo, descricao, data, tipo, prioridade, concluido)
SELECT
  u.id,
  p.id,
  v.titulo, v.descricao, v.data::date, v.tipo, v.prioridade, v.concluido::boolean
FROM auth.users u
CROSS JOIN (VALUES
  ('0012345-78.2024.8.26.0100','Apresentar razões finais',   'Memorial escrito após audiência de instrução',            '2025-05-15','prazo_processual','alta',   'false'),
  ('0098712-14.2024.8.26.0050','Réplica à contestação',      'Prazo de 15 dias para manifestação sobre a contestação',  '2025-05-10','prazo_processual','alta',   'false'),
  ('0098712-14.2024.8.26.0050','Indicar assistente técnico', 'Nomear assistente para acompanhar perícia contábil',      '2025-05-20','diligencia',      'media',  'false'),
  ('0074231-55.2023.8.26.0200','Interpor recurso ordinário', 'Prazo para recurso da sentença desfavorável do INSS',     '2025-05-08','recurso',         'urgente','false'),
  ('0033498-21.2024.8.26.0300','Audiência de mediação',      'Sessão de mediação familiar marcada para esta data',      '2025-05-28','audiencia',       'media',  'false'),
  ('0012345-78.2024.8.26.0100','Recolher custas recursais',  'Guia DARE para depósito recursal trabalhista',            '2025-04-30','prazo_processual','urgente','false'),
  ('0011874-63.2022.8.26.0500','Arquivar documentos físicos','Separar e arquivar pasta do processo encerrado',          '2025-05-30','administrativo',  'baixa',  'true')
) AS v(numero, titulo, descricao, data, tipo, prioridade, concluido)
LEFT JOIN public.processos p ON p.user_id = u.id AND p.numero = v.numero
WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;

-- Prazo sem processo vinculado
INSERT INTO public.prazos (user_id, processo_id, titulo, descricao, data, tipo, prioridade, concluido)
SELECT u.id, NULL, 'Renovar certificado digital', 'Certificado A3 expira em 45 dias', '2025-06-01'::date, 'administrativo', 'baixa', false
FROM auth.users u WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;


-- ── 5. HONORÁRIOS ────────────────────────────────────────────────────────────
INSERT INTO public.honorarios (user_id, processo_id, valor_total, valor_pago, data_vencimento, status, observacoes, tipo_pagamento, numero_parcelas)
SELECT
  u.id, p.id,
  v.valor_total::numeric, v.valor_pago::numeric,
  v.vencimento::date, v.status, v.obs, v.tipo_pgto, v.parcelas::int
FROM auth.users u
CROSS JOIN (VALUES
  ('0012345-78.2024.8.26.0100','15000','5000', '2025-06-30','parcial', 'Honorários de êxito: 30% sobre valor condenado. Entrada de R$ 5.000 paga.',          'parcelado','3'),
  ('0098712-14.2024.8.26.0050','8000', '8000', '2024-12-01','pago',    'Honorários contratuais fixos. Pagamento integral na assinatura do contrato.',        'a_vista',  '0'),
  ('0074231-55.2023.8.26.0200','4500', '0',    '2025-05-15','pendente','Honorários: 30% do benefício acumulado retroativo.',                                  'parcelado','6'),
  ('0033498-21.2024.8.26.0300','6000', '2000', '2025-07-01','parcial', 'Honorários mensais de R$ 1.000. Duas parcelas pagas.',                                'parcelado','6'),
  ('0011874-63.2022.8.26.0500','3200', '3200', '2023-08-01','pago',    'Honorários de defesa criminal. Pagos integralmente antes do início da representação.','a_vista',  '0')
) AS v(numero, valor_total, valor_pago, vencimento, status, obs, tipo_pgto, parcelas)
JOIN public.processos p ON p.user_id = u.id AND p.numero = v.numero
WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;


-- ── 6. TAREFAS ───────────────────────────────────────────────────────────────
INSERT INTO public.tarefas (user_id, processo_id, cliente_id, titulo, descricao, prioridade, status, data_vencimento)
SELECT
  u.id, p.id, c.id,
  v.titulo, v.descricao, v.prioridade, v.status, v.vencimento::date
FROM auth.users u
CROSS JOIN (VALUES
  ('0012345-78.2024.8.26.0100','Roberto Alves Souza',    'Redigir memorial de razões finais',    'Elaborar memorial com resumo dos pontos controvertidos, provas produzidas e fundamentos jurídicos.','urgente','em_andamento','2025-05-14'),
  ('0098712-14.2024.8.26.0050','Ana Clara Mendonça',     'Elaborar réplica à contestação',       'Analisar a contestação e redigir réplica impugnando os argumentos do réu ponto a ponto.',          'alta',   'pendente',    '2025-05-09'),
  ('0074231-55.2023.8.26.0200','Carlos Eduardo Pinheiro','Interpor recurso ordinário',           'Redigir recurso ordinário contra decisão do INSS. Juntar laudo médico atualizado.',                'urgente','pendente',    '2025-05-07'),
  ('0033498-21.2024.8.26.0300','Mariana Rodrigues Lima', 'Preparar proposta de acordo de guarda','Elaborar minuta de acordo de guarda compartilhada para apresentar na audiência de mediação.',      'media',  'pendente',    '2025-05-27'),
  ('0098712-14.2024.8.26.0050','Ana Clara Mendonça',     'Contatar assistente técnico contábil', 'Buscar indicação de assistente técnico para acompanhar perícia no processo de indenização.',       'media',  'em_andamento','2025-05-19'),
  ('0012345-78.2024.8.26.0100','Roberto Alves Souza',    'Calcular depósito recursal',           'Verificar valor da condenação provisória e calcular depósito recursal necessário para o RO.',     'alta',   'concluida',   '2025-04-29'),
  ('0098712-14.2024.8.26.0050','Ana Clara Mendonça',     'Enviar relatório mensal ao cliente',   'Preparar relatório de andamento processual para Ana Clara referente ao mês de abril.',             'baixa',  'concluida',   '2025-04-30')
) AS v(numero, cliente_nome, titulo, descricao, prioridade, status, vencimento)
LEFT JOIN public.processos p ON p.user_id = u.id AND p.numero = v.numero
LEFT JOIN public.clientes  c ON c.user_id = u.id AND c.nome   = v.cliente_nome
WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;

-- Tarefa sem processo/cliente
INSERT INTO public.tarefas (user_id, processo_id, cliente_id, titulo, descricao, prioridade, status, data_vencimento)
SELECT u.id, NULL, NULL,
  'Atualizar contratos de honorários',
  'Revisar modelos de contratos e adequar às novas disposições do Estatuto da OAB.',
  'baixa', 'pendente', '2025-06-15'::date
FROM auth.users u WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;


-- ── 7. DESPESAS ──────────────────────────────────────────────────────────────
INSERT INTO public.despesas (user_id, processo_id, cliente_id, descricao, categoria, valor, data, status, observacoes)
SELECT
  u.id, p.id, c.id,
  v.descricao, v.categoria, v.valor::numeric, v.data::date, v.status, v.obs
FROM auth.users u
CROSS JOIN (VALUES
  ('0012345-78.2024.8.26.0100','Roberto Alves Souza',    'Custas de distribuição trabalhista',    'custas',             '120.00',  '2024-03-10','pago',   'Recolhimento via DARE na distribuição.'),
  ('0098712-14.2024.8.26.0050','Ana Clara Mendonça',     'Honorários de oficial de justiça',      'diligencia',          '85.00',  '2024-02-20','pago',   'Diligência para citação do réu.'),
  ('0074231-55.2023.8.26.0200','Carlos Eduardo Pinheiro','Honorários do médico perito assistente', 'honorarios_periciais','800.00', '2024-01-25','pago',   'Perito contratado para acompanhar perícia do INSS.'),
  ('0012345-78.2024.8.26.0100','Roberto Alves Souza',    'Depósito recursal trabalhista',         'deposito_recursal',  '3500.00', '2025-04-29','pago',   'Depósito de 50% da condenação para interpor RO.'),
  ('0033498-21.2024.8.26.0300','Mariana Rodrigues Lima', 'Taxa de mediação familiar',             'custas',              '200.00', '2025-05-28','pendente','Pagamento da sessão de mediação do TJSP.')
) AS v(numero, cliente_nome, descricao, categoria, valor, data, status, obs)
LEFT JOIN public.processos p ON p.user_id = u.id AND p.numero     = v.numero
LEFT JOIN public.clientes  c ON c.user_id = u.id AND c.nome = v.cliente_nome
WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;

-- Despesas sem processo
INSERT INTO public.despesas (user_id, processo_id, cliente_id, descricao, categoria, valor, data, status, observacoes)
SELECT u.id, NULL, NULL, v.txt, v.cat, v.val::numeric, v.dt::date, v.st, v.obs
FROM auth.users u
CROSS JOIN (VALUES
  ('Assinatura anual — sistema de peticionamento', 'software',       '990.00', '2025-01-15','pago',   'Renovação anual do PeticionamentoWeb.'),
  ('Renovação do certificado digital A3',          'certificado',    '350.00', '2025-06-01','pendente','Certificado ICP-Brasil validade 3 anos.'),
  ('Material de escritório (resmas, cartucho)',    'administrativo', '156.40', '2025-04-10','pago',   'Compra mensal de material de escritório.')
) AS v(txt, cat, val, dt, st, obs)
WHERE u.email = 'matheusghidoni@gmail.com'
ON CONFLICT DO NOTHING;
