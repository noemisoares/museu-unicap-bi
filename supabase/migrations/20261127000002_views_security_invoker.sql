-- =============================================================================
-- 20261127000002_views_security_invoker.sql
-- Configura `security_invoker = true` (PostgreSQL 15+/17) em todas as views
-- do schema `core` expostas a `authenticated` (e views BI), garantindo que as
-- consultas via views respeitem integralmente as politicas RLS e permissoes
-- das tabelas subjacentes.
--
-- NAO DESTRUTIVO: apenas ALTER VIEW, GRANT condicional para app_bi e RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ativar security_invoker = true nas views fato, dashboard e dimensao
-- ---------------------------------------------------------------------------

ALTER VIEW core.vw_fato_visitacao            SET (security_invoker = true);
ALTER VIEW core.vw_fato_satisfacao           SET (security_invoker = true);
ALTER VIEW core.vw_fato_avaliacao_pedagogica SET (security_invoker = true);
ALTER VIEW core.vw_fato_avaliacao_docente    SET (security_invoker = true);
ALTER VIEW core.vw_dashboard_resumo          SET (security_invoker = true);
ALTER VIEW core.vw_dashboard_satisfacao      SET (security_invoker = true);
ALTER VIEW core.vw_dim_escola                SET (security_invoker = true);
ALTER VIEW core.vw_dim_terminal              SET (security_invoker = true);
ALTER VIEW core.vw_dim_topico                SET (security_invoker = true);
ALTER VIEW core.vw_dim_geografia             SET (security_invoker = true);

-- ---------------------------------------------------------------------------
-- 2. Garantir RLS tambem na tabela legada core.avaliacao_pedagogica
-- ---------------------------------------------------------------------------

ALTER TABLE core.avaliacao_pedagogica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avaliacao_pedagogica_legada_select_admin ON core.avaliacao_pedagogica;
CREATE POLICY avaliacao_pedagogica_legada_select_admin ON core.avaliacao_pedagogica
  FOR SELECT TO authenticated USING (core.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Manter compatibilidade do papel app_bi com security_invoker = true
--    (somente leitura nas tabelas de core usadas pelas views BI;
--     sem acesso a pii, core.admin_usuario ou manipulacao de dados)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_bi') THEN
    GRANT SELECT ON
      core.instituicao,
      core.terminal,
      core.topico,
      core.visitacao,
      core.avaliacao_satisfacao,
      core.avaliacao_pedagogica,
      core.avaliacao_pedagogica_completa
    TO app_bi;

    GRANT SELECT ON
      core.vw_fato_avaliacao_pedagogica,
      core.vw_dashboard_resumo,
      core.vw_dashboard_satisfacao
    TO app_bi;

    DROP POLICY IF EXISTS instituicao_select_bi ON core.instituicao;
    CREATE POLICY instituicao_select_bi ON core.instituicao
      FOR SELECT TO app_bi USING (true);

    DROP POLICY IF EXISTS terminal_select_bi ON core.terminal;
    CREATE POLICY terminal_select_bi ON core.terminal
      FOR SELECT TO app_bi USING (true);

    DROP POLICY IF EXISTS topico_select_bi ON core.topico;
    CREATE POLICY topico_select_bi ON core.topico
      FOR SELECT TO app_bi USING (true);

    DROP POLICY IF EXISTS visitacao_select_bi ON core.visitacao;
    CREATE POLICY visitacao_select_bi ON core.visitacao
      FOR SELECT TO app_bi USING (true);

    DROP POLICY IF EXISTS satisfacao_select_bi ON core.avaliacao_satisfacao;
    CREATE POLICY satisfacao_select_bi ON core.avaliacao_satisfacao
      FOR SELECT TO app_bi USING (true);

    DROP POLICY IF EXISTS pedagogica_legada_select_bi ON core.avaliacao_pedagogica;
    CREATE POLICY pedagogica_legada_select_bi ON core.avaliacao_pedagogica
      FOR SELECT TO app_bi USING (true);

    DROP POLICY IF EXISTS pedagogica_completa_select_bi ON core.avaliacao_pedagogica_completa;
    CREATE POLICY pedagogica_completa_select_bi ON core.avaliacao_pedagogica_completa
      FOR SELECT TO app_bi USING (true);
  END IF;
END
$$;
