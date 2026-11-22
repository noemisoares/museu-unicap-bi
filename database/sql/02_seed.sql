-- =============================================================================
-- 02_seed.sql — Dados iniciais (catalogos). Idempotente.
-- Os nomes abaixo sao SUGESTAO: ajuste com a equipe de mediacao do museu.
-- =============================================================================

INSERT INTO core.terminal (nome, tipo, localizacao) VALUES
    ('Check-in Recepcao',          'CHECKIN',        'Recepcao do museu'),
    ('Totem Saida 01',             'TOTEM_SAIDA',    'Saida do museu'),
    ('Formulario Pedagogico Web',  'FORMULARIO_WEB', 'Online (link enviado aos docentes)')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO core.topico (nome, descricao, tipo) VALUES
    ('Experiencia geral',        'Avaliacao geral da visita.',                              'SATISFACAO'),
    ('Mediacao',                 'Qualidade da mediacao e do atendimento da equipe.',       'AMBOS'),
    ('Acolhimento',              'Recepcao e acolhimento do visitante ou do grupo escolar.','AMBOS'),
    ('Estrutura e exposicao',    'Estrutura fisica, sinalizacao e organizacao do acervo.',  'SATISFACAO'),
    ('Aderencia ao curriculo',   'Relacao da exposicao com o curriculo escolar.',           'PEDAGOGICA'),
    ('Material de apoio',        'Qualidade dos materiais de apoio oferecidos ao docente.', 'PEDAGOGICA')
ON CONFLICT (nome) DO NOTHING;
