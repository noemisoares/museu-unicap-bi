-- =============================================================================
-- 05_validacao.sql — Testes das restricoes de integridade (RNF04 / RNF06)
-- Execute DEPOIS dos scripts 01 a 04. Tudo roda dentro de uma transacao que e
-- desfeita (ROLLBACK) no final: nenhum dado de teste permanece no banco.
-- Resultado esperado: varias mensagens "OK: ..." e, no fim, "VALIDACAO CONCLUIDA".
-- Qualquer erro com "TESTE FALHOU" indica restricao ausente ou incorreta.
-- =============================================================================
\set ON_ERROR_STOP on
SET client_min_messages = NOTICE;

BEGIN;

-- Dados-base (UUIDs fixos so para este teste)
INSERT INTO core.terminal (id, nome, tipo) VALUES
    ('00000000-0000-0000-0000-0000000000a1', 'TESTE terminal', 'CHECKIN');
INSERT INTO core.topico (id, nome, tipo) VALUES
    ('00000000-0000-0000-0000-0000000000b1', 'TESTE topico 1', 'AMBOS'),
    ('00000000-0000-0000-0000-0000000000b2', 'TESTE topico 2', 'AMBOS');
INSERT INTO core.instituicao (id, nome, rede) VALUES
    ('00000000-0000-0000-0000-0000000000c1', 'TESTE escola 1', 'PUBLICA'),
    ('00000000-0000-0000-0000-0000000000c2', 'TESTE escola 2', 'PRIVADA');
INSERT INTO core.visitacao (id, terminal_id, instituicao_id, turno, data_hora, tipo_visita, qtd_visitantes) VALUES
    ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', NULL,
     'MANHA', now(), 'INDIVIDUAL', 1),
    ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a1',
     '00000000-0000-0000-0000-0000000000c1', 'TARDE', now(), 'GRUPO_ESCOLAR', 30);

DO $$ BEGIN RAISE NOTICE 'OK: insercoes validas aceitas'; END $$;

-- 1. visitacao: qtd_visitantes < 1
DO $$ BEGIN
  BEGIN
    INSERT INTO core.visitacao (terminal_id, turno, data_hora, tipo_visita, qtd_visitantes)
    VALUES ('00000000-0000-0000-0000-0000000000a1', 'MANHA', now(), 'INDIVIDUAL', 0);
    RAISE EXCEPTION 'TESTE FALHOU: aceitou qtd_visitantes = 0';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: qtd_visitantes >= 1'; END;
END $$;

-- 2. visitacao: turno invalido
DO $$ BEGIN
  BEGIN
    INSERT INTO core.visitacao (terminal_id, turno, data_hora, tipo_visita)
    VALUES ('00000000-0000-0000-0000-0000000000a1', 'MADRUGADA', now(), 'INDIVIDUAL');
    RAISE EXCEPTION 'TESTE FALHOU: aceitou turno invalido';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: turno restrito a MANHA/TARDE/NOITE'; END;
END $$;

-- 3. visitacao: GRUPO_ESCOLAR sem instituicao
DO $$ BEGIN
  BEGIN
    INSERT INTO core.visitacao (terminal_id, turno, data_hora, tipo_visita, qtd_visitantes)
    VALUES ('00000000-0000-0000-0000-0000000000a1', 'MANHA', now(), 'GRUPO_ESCOLAR', 20);
    RAISE EXCEPTION 'TESTE FALHOU: aceitou grupo escolar sem instituicao';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: grupo escolar exige instituicao'; END;
END $$;

-- 4. visitacao: terminal inexistente
DO $$ BEGIN
  BEGIN
    INSERT INTO core.visitacao (terminal_id, turno, data_hora, tipo_visita)
    VALUES ('00000000-0000-0000-0000-00000000ffff', 'MANHA', now(), 'INDIVIDUAL');
    RAISE EXCEPTION 'TESTE FALHOU: aceitou terminal inexistente';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK: FK visitacao -> terminal'; END;
END $$;

-- 5. contato valido
INSERT INTO pii.contato (id, visitacao_id, nome, email, whatsapp, consentimento,
                         finalidade_consentimento, data_consentimento)
VALUES ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1',
        'Fulana de Teste', 'fulana@exemplo.com', '+5581999999999', TRUE,
        'relacionamento pos-visita', now());
DO $$ BEGIN RAISE NOTICE 'OK: contato valido aceito'; END $$;

-- 6. contato duplicado para a mesma visitacao
DO $$ BEGIN
  BEGIN
    INSERT INTO pii.contato (visitacao_id, email, consentimento, finalidade_consentimento, data_consentimento)
    VALUES ('00000000-0000-0000-0000-0000000000d1', 'outro@exemplo.com', TRUE, 'teste', now());
    RAISE EXCEPTION 'TESTE FALHOU: aceitou 2 contatos para a mesma visitacao';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK: no maximo 1 contato por visitacao'; END;
END $$;

-- 7. contato com consentimento e sem nenhum meio de contato
DO $$ BEGIN
  BEGIN
    INSERT INTO pii.contato (visitacao_id, nome, consentimento, finalidade_consentimento, data_consentimento)
    VALUES ('00000000-0000-0000-0000-0000000000d2', 'Sem meio de contato', TRUE, 'teste', now());
    RAISE EXCEPTION 'TESTE FALHOU: aceitou contato sem email e sem whatsapp';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: exige email ou whatsapp'; END;
END $$;

-- 8. contato com email e whatsapp em formato invalido
DO $$ BEGIN
  BEGIN
    INSERT INTO pii.contato (visitacao_id, email, consentimento, finalidade_consentimento, data_consentimento)
    VALUES ('00000000-0000-0000-0000-0000000000d2', 'email-invalido', TRUE, 'teste', now());
    RAISE EXCEPTION 'TESTE FALHOU: aceitou email invalido';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: formato de email'; END;
  BEGIN
    INSERT INTO pii.contato (visitacao_id, whatsapp, consentimento, finalidade_consentimento, data_consentimento)
    VALUES ('00000000-0000-0000-0000-0000000000d2', '81999999999', TRUE, 'teste', now());
    RAISE EXCEPTION 'TESTE FALHOU: aceitou whatsapp fora do formato E.164';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: formato de whatsapp (E.164)'; END;
END $$;

-- 9. contato revogado mantendo dados pessoais
DO $$ BEGIN
  BEGIN
    INSERT INTO pii.contato (visitacao_id, email, consentimento, finalidade_consentimento,
                             data_consentimento, data_revogacao)
    VALUES ('00000000-0000-0000-0000-0000000000d2', 'a@b.com', FALSE, 'teste', now(), now());
    RAISE EXCEPTION 'TESTE FALHOU: aceitou revogado com dados pessoais';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: revogado exige anonimizacao'; END;
END $$;

-- 10. funcao de revogacao anonimiza e mantem a visitacao
SELECT pii.revogar_consentimento('00000000-0000-0000-0000-0000000000e1');
DO $$
DECLARE r pii.contato%ROWTYPE;
BEGIN
  SELECT * INTO r FROM pii.contato WHERE id = '00000000-0000-0000-0000-0000000000e1';
  IF r.consentimento OR r.nome IS NOT NULL OR r.email IS NOT NULL OR r.whatsapp IS NOT NULL
     OR r.data_revogacao IS NULL THEN
    RAISE EXCEPTION 'TESTE FALHOU: revogar_consentimento nao anonimizou';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.visitacao WHERE id = '00000000-0000-0000-0000-0000000000d1') THEN
    RAISE EXCEPTION 'TESTE FALHOU: visitacao foi afetada pela revogacao';
  END IF;
  RAISE NOTICE 'OK: revogar_consentimento anonimiza e preserva a visitacao';
END $$;

-- 11. avaliacao_satisfacao: sem nenhuma nota
DO $$ BEGIN
  BEGIN
    INSERT INTO core.avaliacao_satisfacao (terminal_id, topico_id)
    VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1');
    RAISE EXCEPTION 'TESTE FALHOU: aceitou avaliacao sem nota';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: satisfacao exige ao menos uma nota'; END;
END $$;

-- 12. avaliacao_satisfacao: NPS fora de 0-10 e Likert fora de 1-5
DO $$ BEGIN
  BEGIN
    INSERT INTO core.avaliacao_satisfacao (terminal_id, topico_id, nota_nps)
    VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 11);
    RAISE EXCEPTION 'TESTE FALHOU: aceitou NPS = 11';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: NPS entre 0 e 10'; END;
  BEGIN
    INSERT INTO core.avaliacao_satisfacao (terminal_id, topico_id, nota_likert)
    VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 6);
    RAISE EXCEPTION 'TESTE FALHOU: aceitou Likert = 6';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: Likert entre 1 e 5'; END;
END $$;

-- 13. avaliacao_satisfacao anonima (sem visitacao) e valida
INSERT INTO core.avaliacao_satisfacao (terminal_id, topico_id, nota_nps)
VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 10);
DO $$ BEGIN RAISE NOTICE 'OK: avaliacao de satisfacao anonima aceita'; END $$;

-- 14. avaliacao_pedagogica valida
INSERT INTO core.avaliacao_pedagogica (visitacao_id, instituicao_id, topico_id, nota_likert)
VALUES ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1',
        '00000000-0000-0000-0000-0000000000b1', 5);
DO $$ BEGIN RAISE NOTICE 'OK: avaliacao pedagogica valida aceita'; END $$;

-- 15. avaliacao_pedagogica duplicada (mesma visitacao + topico)
DO $$ BEGIN
  BEGIN
    INSERT INTO core.avaliacao_pedagogica (visitacao_id, instituicao_id, topico_id, nota_likert)
    VALUES ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1',
            '00000000-0000-0000-0000-0000000000b1', 4);
    RAISE EXCEPTION 'TESTE FALHOU: aceitou avaliacao pedagogica duplicada';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK: unica por visitacao + topico'; END;
END $$;

-- 16. avaliacao_pedagogica com instituicao diferente da visitacao
DO $$ BEGIN
  BEGIN
    INSERT INTO core.avaliacao_pedagogica (visitacao_id, instituicao_id, topico_id, nota_likert)
    VALUES ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2',
            '00000000-0000-0000-0000-0000000000b2', 3);
    RAISE EXCEPTION 'TESTE FALHOU: aceitou instituicao diferente da visitacao';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK: instituicao coerente com a visitacao'; END;
END $$;

-- 17. avaliacao_pedagogica: Likert fora de 1-5
DO $$ BEGIN
  BEGIN
    INSERT INTO core.avaliacao_pedagogica (visitacao_id, instituicao_id, topico_id, nota_likert)
    VALUES ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1',
            '00000000-0000-0000-0000-0000000000b2', 0);
    RAISE EXCEPTION 'TESTE FALHOU: aceitou Likert = 0';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK: Likert pedagogico entre 1 e 5'; END;
END $$;

-- 18. Views de BI funcionam e nao expoem dados pessoais
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT count(*) INTO n FROM core.vw_fato_visitacao;  IF n < 2 THEN RAISE EXCEPTION 'TESTE FALHOU: vw_fato_visitacao'; END IF;
  SELECT count(*) INTO n FROM core.vw_fato_satisfacao; IF n < 1 THEN RAISE EXCEPTION 'TESTE FALHOU: vw_fato_satisfacao'; END IF;
  SELECT count(*) INTO n FROM core.vw_fato_avaliacao_docente; IF n < 1 THEN RAISE EXCEPTION 'TESTE FALHOU: vw_fato_avaliacao_docente'; END IF;
  SELECT count(*) INTO n FROM core.vw_dim_geografia;   IF n < 1 THEN RAISE EXCEPTION 'TESTE FALHOU: vw_dim_geografia'; END IF;
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema = 'core' AND table_name LIKE 'vw\_%'
     AND column_name IN ('nome_contato', 'email', 'whatsapp', 'comentario');
  IF n > 0 THEN RAISE EXCEPTION 'TESTE FALHOU: view de BI expoe dado pessoal ou comentario'; END IF;
  RAISE NOTICE 'OK: views de BI funcionam e nao expoem dados pessoais';
END $$;

-- 19. Papel de BI sem acesso ao schema pii
DO $$ BEGIN
  IF has_schema_privilege('app_bi', 'pii', 'USAGE') THEN
    RAISE EXCEPTION 'TESTE FALHOU: app_bi tem acesso ao schema pii';
  END IF;
  IF NOT has_table_privilege('app_bi', 'core.vw_fato_visitacao', 'SELECT') THEN
    RAISE EXCEPTION 'TESTE FALHOU: app_bi sem acesso as views de core';
  END IF;
  IF has_table_privilege('app_bi', 'core.visitacao', 'SELECT') THEN
    RAISE EXCEPTION 'TESTE FALHOU: app_bi le tabelas base de core';
  END IF;
  RAISE NOTICE 'OK: app_bi so le as views e nao acessa pii';
END $$;

ROLLBACK;

\echo 'VALIDACAO CONCLUIDA: todas as restricoes se comportaram como esperado.'
