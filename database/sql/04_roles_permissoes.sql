-- =============================================================================
-- 04_roles_permissoes.sql — Papeis e permissoes (RNF06 / LGPD)
-- Cria papeis de grupo (NOLOGIN). Associe usuarios reais a eles, por exemplo:
--   CREATE ROLE usuario_backend LOGIN PASSWORD '...' IN ROLE app_backend;
--   CREATE ROLE usuario_bi      LOGIN PASSWORD '...' IN ROLE app_bi;
-- Execute como superusuario ou dono do banco.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_backend') THEN
        CREATE ROLE app_backend NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_bi') THEN
        CREATE ROLE app_bi NOLOGIN;
    END IF;
END
$$;

-- Limpa privilegios padrao
REVOKE ALL ON SCHEMA core, pii FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA core, pii FROM PUBLIC;

-- Backend: le e escreve em core e pii
GRANT USAGE ON SCHEMA core, pii TO app_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO app_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pii  TO app_backend;
GRANT EXECUTE ON FUNCTION pii.revogar_consentimento(UUID) TO app_backend;

-- BI: somente leitura das views de core. Sem acesso ao schema pii.
GRANT USAGE ON SCHEMA core TO app_bi;
GRANT SELECT ON
    core.vw_dim_escola,
    core.vw_dim_terminal,
    core.vw_dim_topico,
    core.vw_dim_geografia,
    core.vw_fato_visitacao,
    core.vw_fato_satisfacao,
    core.vw_fato_avaliacao_docente
TO app_bi;
