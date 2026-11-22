-- =============================================================================
-- 01_schema.sql
-- Museu de Arqueologia e Ciências Naturais da UNICAP — Livro de Visitantes Digital
-- Task MDADOS-0001 (#11): modelagem relacional (DDL)
--
-- SGBD: PostgreSQL 14+ (testado no 16)
-- Convenções (RNF11): snake_case, tabelas no singular, PK = id (UUID),
--   FK = <entidade>_id, constraints nomeadas (pk_/fk_/uq_/ck_), índices idx_.
-- Separação LGPD (RNF06): dados pessoais SOMENTE em pii.contato.
-- Idempotência: este script NÃO recria objetos existentes. Para recriar do zero,
--   use o bloco de reset comentado no final de database/README.md.
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS core;  -- dados operacionais e estatísticos (sem dados pessoais)
CREATE SCHEMA IF NOT EXISTS pii;   -- dados pessoais (acesso restrito)

COMMENT ON SCHEMA core IS 'Dados operacionais do museu, sem dados pessoais identificaveis.';
COMMENT ON SCHEMA pii  IS 'Dados pessoais (LGPD). Acesso restrito ao backend.';

-- -----------------------------------------------------------------------------
-- core.instituicao
-- -----------------------------------------------------------------------------
CREATE TABLE core.instituicao (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    nome          VARCHAR(200) NOT NULL,
    rede          VARCHAR(10)  NOT NULL,
    nivel_ensino  VARCHAR(30),
    cidade        VARCHAR(100),
    uf            CHAR(2),
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_instituicao PRIMARY KEY (id),
    CONSTRAINT uq_instituicao_nome_cidade_uf UNIQUE (nome, cidade, uf),
    CONSTRAINT ck_instituicao_rede CHECK (rede IN ('PUBLICA', 'PRIVADA')),
    CONSTRAINT ck_instituicao_nivel_ensino CHECK (
        nivel_ensino IS NULL OR nivel_ensino IN
        ('INFANTIL', 'FUNDAMENTAL', 'MEDIO', 'SUPERIOR', 'OUTRO')),
    CONSTRAINT ck_instituicao_uf CHECK (uf IS NULL OR uf ~ '^[A-Z]{2}$')
);
COMMENT ON TABLE  core.instituicao IS 'Instituicoes (escolas e outras) que visitam o museu. Alimenta a dimensao Escolas.';
COMMENT ON COLUMN core.instituicao.rede IS 'PUBLICA ou PRIVADA.';
COMMENT ON COLUMN core.instituicao.nivel_ensino IS 'INFANTIL, FUNDAMENTAL, MEDIO, SUPERIOR ou OUTRO.';

-- -----------------------------------------------------------------------------
-- core.terminal
-- -----------------------------------------------------------------------------
CREATE TABLE core.terminal (
    id             UUID         NOT NULL DEFAULT gen_random_uuid(),
    nome           VARCHAR(100) NOT NULL,
    tipo           VARCHAR(20)  NOT NULL,
    localizacao    VARCHAR(150),
    status         VARCHAR(15)  NOT NULL DEFAULT 'ATIVO',
    ultimo_acesso  TIMESTAMPTZ,
    CONSTRAINT pk_terminal PRIMARY KEY (id),
    CONSTRAINT uq_terminal_nome UNIQUE (nome),
    CONSTRAINT ck_terminal_tipo CHECK (tipo IN ('CHECKIN', 'TOTEM_SAIDA', 'FORMULARIO_WEB')),
    CONSTRAINT ck_terminal_status CHECK (status IN ('ATIVO', 'INATIVO', 'MANUTENCAO'))
);
COMMENT ON TABLE  core.terminal IS 'Pontos de coleta digitais: check-in na recepcao, totem de saida e formulario web.';
COMMENT ON COLUMN core.terminal.ultimo_acesso IS 'Ultima vez que o terminal registrou atividade (monitoramento).';

-- -----------------------------------------------------------------------------
-- core.topico
-- -----------------------------------------------------------------------------
CREATE TABLE core.topico (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    nome       VARCHAR(100) NOT NULL,
    descricao  TEXT,
    tipo       VARCHAR(15)  NOT NULL,
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_topico PRIMARY KEY (id),
    CONSTRAINT uq_topico_nome UNIQUE (nome),
    CONSTRAINT ck_topico_tipo CHECK (tipo IN ('SATISFACAO', 'PEDAGOGICA', 'AMBOS'))
);
COMMENT ON TABLE  core.topico IS 'Catalogo de assuntos avaliados (acolhimento, mediacao, estrutura etc.).';
COMMENT ON COLUMN core.topico.tipo IS 'Em qual avaliacao o topico pode ser usado: SATISFACAO, PEDAGOGICA ou AMBOS.';

-- -----------------------------------------------------------------------------
-- core.visitacao  (NAO contem dados pessoais)
-- -----------------------------------------------------------------------------
CREATE TABLE core.visitacao (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    terminal_id     UUID         NOT NULL,
    instituicao_id  UUID,
    turno           VARCHAR(10)  NOT NULL,
    data_hora       TIMESTAMPTZ  NOT NULL,
    tipo_visita     VARCHAR(20)  NOT NULL,
    qtd_visitantes  INTEGER      NOT NULL DEFAULT 1,
    bairro          VARCHAR(100),
    cidade          VARCHAR(100),
    uf              CHAR(2),
    pais            VARCHAR(60),
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_visitacao PRIMARY KEY (id),
    -- Necessario para a FK composta de avaliacao_pedagogica (garante instituicao coerente)
    CONSTRAINT uq_visitacao_id_instituicao UNIQUE (id, instituicao_id),
    CONSTRAINT fk_visitacao_terminal FOREIGN KEY (terminal_id)
        REFERENCES core.terminal (id),
    CONSTRAINT fk_visitacao_instituicao FOREIGN KEY (instituicao_id)
        REFERENCES core.instituicao (id),
    CONSTRAINT ck_visitacao_turno CHECK (turno IN ('MANHA', 'TARDE', 'NOITE')),
    CONSTRAINT ck_visitacao_tipo_visita CHECK (
        tipo_visita IN ('INDIVIDUAL', 'GRUPO_ESCOLAR', 'GRUPO_OUTRO')),
    CONSTRAINT ck_visitacao_qtd_visitantes CHECK (qtd_visitantes >= 1),
    CONSTRAINT ck_visitacao_escolar_exige_instituicao CHECK (
        tipo_visita <> 'GRUPO_ESCOLAR' OR instituicao_id IS NOT NULL),
    CONSTRAINT ck_visitacao_uf CHECK (uf IS NULL OR uf ~ '^[A-Z]{2}$')
);
COMMENT ON TABLE  core.visitacao IS 'Registro de cada visita (individual ou em grupo). Fato Visitacao. Sem dados pessoais.';
COMMENT ON COLUMN core.visitacao.data_hora IS 'Data e hora da entrada (check-in).';
COMMENT ON COLUMN core.visitacao.qtd_visitantes IS 'Numero de pessoas na visita (1 para individual).';
COMMENT ON COLUMN core.visitacao.bairro IS 'Origem do visitante (bairro). Em visita escolar, a geografia pode vir da instituicao (ver vw_dim_geografia).';

-- -----------------------------------------------------------------------------
-- pii.contato  (UNICA tabela com dados pessoais)
-- -----------------------------------------------------------------------------
CREATE TABLE pii.contato (
    id                        UUID          NOT NULL DEFAULT gen_random_uuid(),
    visitacao_id              UUID          NOT NULL,
    nome                      VARCHAR(150),
    email                     VARCHAR(254),
    whatsapp                  VARCHAR(20),
    consentimento             BOOLEAN       NOT NULL,
    finalidade_consentimento  VARCHAR(100)  NOT NULL,
    data_consentimento        TIMESTAMPTZ   NOT NULL,
    data_revogacao            TIMESTAMPTZ,
    criado_em                 TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_contato PRIMARY KEY (id),
    -- 1:0..1 — a visitacao pode ter no maximo um contato; visitacao nao aponta para contato
    CONSTRAINT uq_contato_visitacao UNIQUE (visitacao_id),
    CONSTRAINT fk_contato_visitacao FOREIGN KEY (visitacao_id)
        REFERENCES core.visitacao (id),
    CONSTRAINT ck_contato_email_formato CHECK (
        email IS NULL OR email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    CONSTRAINT ck_contato_whatsapp_formato CHECK (
        whatsapp IS NULL OR whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
    -- Com consentimento ativo, e preciso ter ao menos um meio de contato
    CONSTRAINT ck_contato_meio_de_contato CHECK (
        consentimento = FALSE OR email IS NOT NULL OR whatsapp IS NOT NULL),
    -- Estado do consentimento coerente com a data de revogacao
    CONSTRAINT ck_contato_estado_consentimento CHECK (
        (consentimento = TRUE  AND data_revogacao IS NULL) OR
        (consentimento = FALSE AND data_revogacao IS NOT NULL)),
    CONSTRAINT ck_contato_revogacao_apos_consentimento CHECK (
        data_revogacao IS NULL OR data_revogacao >= data_consentimento),
    -- Consentimento revogado => dados pessoais anonimizados
    CONSTRAINT ck_contato_revogado_anonimizado CHECK (
        consentimento = TRUE OR (nome IS NULL AND email IS NULL AND whatsapp IS NULL))
);
COMMENT ON TABLE  pii.contato IS 'Dados pessoais de contato (LGPD). Isolado de core. Uma linha por visitacao, no maximo.';
COMMENT ON COLUMN pii.contato.consentimento IS 'TRUE = consentimento ativo. FALSE = revogado (dados pessoais anonimizados).';
COMMENT ON COLUMN pii.contato.finalidade_consentimento IS 'Finalidade informada ao titular. Ex.: relacionamento pos-visita.';

-- -----------------------------------------------------------------------------
-- core.avaliacao_satisfacao  (totem de saida)
-- -----------------------------------------------------------------------------
CREATE TABLE core.avaliacao_satisfacao (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    visitacao_id  UUID,
    terminal_id   UUID         NOT NULL,
    topico_id     UUID         NOT NULL,
    nota_likert   SMALLINT,
    nota_nps      SMALLINT,
    comentario    TEXT,
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_avaliacao_satisfacao PRIMARY KEY (id),
    CONSTRAINT fk_avaliacao_satisfacao_visitacao FOREIGN KEY (visitacao_id)
        REFERENCES core.visitacao (id),
    CONSTRAINT fk_avaliacao_satisfacao_terminal FOREIGN KEY (terminal_id)
        REFERENCES core.terminal (id),
    CONSTRAINT fk_avaliacao_satisfacao_topico FOREIGN KEY (topico_id)
        REFERENCES core.topico (id),
    CONSTRAINT ck_avaliacao_satisfacao_likert CHECK (
        nota_likert IS NULL OR nota_likert BETWEEN 1 AND 5),
    CONSTRAINT ck_avaliacao_satisfacao_nps CHECK (
        nota_nps IS NULL OR nota_nps BETWEEN 0 AND 10),
    CONSTRAINT ck_avaliacao_satisfacao_ao_menos_uma_nota CHECK (
        nota_likert IS NOT NULL OR nota_nps IS NOT NULL)
);
COMMENT ON TABLE  core.avaliacao_satisfacao IS 'Respostas do totem de saida. Fato Satisfacao.';
COMMENT ON COLUMN core.avaliacao_satisfacao.visitacao_id IS 'Opcional: o totem pode ser anonimo.';
COMMENT ON COLUMN core.avaliacao_satisfacao.comentario IS 'Texto livre. Atencao: pode conter dado pessoal digitado pelo visitante.';

-- -----------------------------------------------------------------------------
-- core.avaliacao_pedagogica  (formulario pos-visita dos docentes)
-- -----------------------------------------------------------------------------
CREATE TABLE core.avaliacao_pedagogica (
    id              UUID         NOT NULL DEFAULT gen_random_uuid(),
    visitacao_id    UUID         NOT NULL,
    instituicao_id  UUID         NOT NULL,
    topico_id       UUID         NOT NULL,
    nota_likert     SMALLINT     NOT NULL,
    comentario      TEXT,
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_avaliacao_pedagogica PRIMARY KEY (id),
    CONSTRAINT uq_avaliacao_pedagogica_visitacao_topico UNIQUE (visitacao_id, topico_id),
    CONSTRAINT fk_avaliacao_pedagogica_visitacao FOREIGN KEY (visitacao_id)
        REFERENCES core.visitacao (id),
    CONSTRAINT fk_avaliacao_pedagogica_instituicao FOREIGN KEY (instituicao_id)
        REFERENCES core.instituicao (id),
    CONSTRAINT fk_avaliacao_pedagogica_topico FOREIGN KEY (topico_id)
        REFERENCES core.topico (id),
    -- A instituicao informada precisa ser a mesma da visitacao
    CONSTRAINT fk_avaliacao_pedagogica_visitacao_instituicao
        FOREIGN KEY (visitacao_id, instituicao_id)
        REFERENCES core.visitacao (id, instituicao_id),
    CONSTRAINT ck_avaliacao_pedagogica_likert CHECK (nota_likert BETWEEN 1 AND 5)
);
COMMENT ON TABLE core.avaliacao_pedagogica IS 'Avaliacao dos docentes sobre a visita escolar, uma linha por topico. Fato Avaliacao Docente.';

-- -----------------------------------------------------------------------------
-- Indices (FKs e consultas de BI)
-- -----------------------------------------------------------------------------
CREATE INDEX idx_visitacao_terminal_id      ON core.visitacao (terminal_id);
CREATE INDEX idx_visitacao_instituicao_id   ON core.visitacao (instituicao_id);
CREATE INDEX idx_visitacao_data_hora        ON core.visitacao (data_hora);
CREATE INDEX idx_avaliacao_satisfacao_visitacao_id ON core.avaliacao_satisfacao (visitacao_id);
CREATE INDEX idx_avaliacao_satisfacao_terminal_id  ON core.avaliacao_satisfacao (terminal_id);
CREATE INDEX idx_avaliacao_satisfacao_topico_id    ON core.avaliacao_satisfacao (topico_id);
CREATE INDEX idx_avaliacao_satisfacao_criado_em    ON core.avaliacao_satisfacao (criado_em);
CREATE INDEX idx_avaliacao_pedagogica_instituicao_id ON core.avaliacao_pedagogica (instituicao_id);
CREATE INDEX idx_avaliacao_pedagogica_topico_id      ON core.avaliacao_pedagogica (topico_id);

-- -----------------------------------------------------------------------------
-- Funcao de revogacao de consentimento (LGPD): anonimiza os dados pessoais
-- -----------------------------------------------------------------------------
CREATE FUNCTION pii.revogar_consentimento(p_contato_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE pii.contato
       SET consentimento  = FALSE,
           data_revogacao = now(),
           nome           = NULL,
           email          = NULL,
           whatsapp       = NULL
     WHERE id = p_contato_id
       AND consentimento = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contato % nao encontrado ou consentimento ja revogado', p_contato_id
            USING ERRCODE = 'no_data_found';
    END IF;
END;
$$;
COMMENT ON FUNCTION pii.revogar_consentimento(UUID) IS
    'Revoga o consentimento e anonimiza nome, email e whatsapp. A visitacao e mantida.';

COMMIT;
