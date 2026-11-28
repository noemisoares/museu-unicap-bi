-- Executar manualmente SOMENTE após retirar de circulação o front anterior.
-- Não colocar em migrations: a aplicação automática antecipada quebraria os totens.
REVOKE EXECUTE ON FUNCTION core.registrar_checkin FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION core.registrar_satisfacao FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION core.registrar_pedagogica FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION core.gerar_protocolo FROM PUBLIC, anon, authenticated;
