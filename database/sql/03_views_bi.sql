-- =============================================================================
-- 03_views_bi.sql — Views para o Power BI (esquema estrela)
-- Nenhuma view expoe pii.contato. O NPS e calculado no BI (DAX) a partir de
-- nota_nps / classificacao_nps.
-- A Dimensao Calendario e gerada no proprio Power BI (a partir de data_hora).
-- =============================================================================

CREATE OR REPLACE VIEW core.vw_dim_escola AS
SELECT
    i.id            AS instituicao_id,
    i.nome,
    i.rede,
    i.nivel_ensino,
    i.cidade,
    i.uf
FROM core.instituicao i;

CREATE OR REPLACE VIEW core.vw_dim_terminal AS
SELECT t.id AS terminal_id, t.nome, t.tipo, t.localizacao, t.status
FROM core.terminal t;

CREATE OR REPLACE VIEW core.vw_dim_topico AS
SELECT tp.id AS topico_id, tp.nome, tp.tipo, tp.ativo
FROM core.topico tp;

-- Geografia unica: origem informada na visitacao; se ausente (visita escolar), usa a da instituicao.
CREATE OR REPLACE VIEW core.vw_dim_geografia AS
SELECT DISTINCT
    v.bairro,
    COALESCE(v.cidade, i.cidade)           AS cidade,
    COALESCE(v.uf, i.uf)                   AS uf,
    COALESCE(v.pais, 'Brasil')             AS pais
FROM core.visitacao v
LEFT JOIN core.instituicao i ON i.id = v.instituicao_id;

CREATE OR REPLACE VIEW core.vw_fato_visitacao AS
SELECT
    v.id                                   AS visitacao_id,
    v.data_hora,
    v.data_hora::date                      AS data_visita,
    v.turno,
    v.tipo_visita,
    v.qtd_visitantes,
    v.terminal_id,
    v.instituicao_id,
    v.bairro,
    COALESCE(v.cidade, i.cidade)           AS cidade,
    COALESCE(v.uf, i.uf)                   AS uf,
    COALESCE(v.pais, 'Brasil')             AS pais
FROM core.visitacao v
LEFT JOIN core.instituicao i ON i.id = v.instituicao_id;

CREATE OR REPLACE VIEW core.vw_fato_satisfacao AS
SELECT
    a.id                                   AS avaliacao_satisfacao_id,
    a.visitacao_id,
    a.terminal_id,
    a.topico_id,
    a.nota_likert,
    a.nota_nps,
    CASE
        WHEN a.nota_nps IS NULL  THEN NULL
        WHEN a.nota_nps >= 9     THEN 'PROMOTOR'
        WHEN a.nota_nps >= 7     THEN 'NEUTRO'
        ELSE 'DETRATOR'
    END                                    AS classificacao_nps,
    a.criado_em,
    a.criado_em::date                      AS data_avaliacao
FROM core.avaliacao_satisfacao a;

CREATE OR REPLACE VIEW core.vw_fato_avaliacao_docente AS
SELECT
    p.id                                   AS avaliacao_pedagogica_id,
    p.visitacao_id,
    p.instituicao_id,
    p.topico_id,
    p.nota_likert,
    p.criado_em,
    p.criado_em::date                      AS data_avaliacao
FROM core.avaliacao_pedagogica p;
-- Obs.: o campo comentario fica fora das views de BI de proposito (pode conter dado pessoal).
