-- Papel exclusivo da API Express e isolamento do contato pedagógico.
-- Esta migração é compatível com a assinatura RPC usada pelo front anterior.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_express') THEN
    CREATE ROLE app_express NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA core TO app_express;
GRANT SELECT ON core.topico, core.terminal TO app_express;
GRANT EXECUTE ON FUNCTION core.registrar_checkin TO app_express;
GRANT EXECUTE ON FUNCTION core.registrar_satisfacao TO app_express;
GRANT EXECUTE ON FUNCTION core.registrar_pedagogica TO app_express;

CREATE POLICY topico_select_express ON core.topico
  FOR SELECT TO app_express USING (true);
CREATE POLICY terminal_select_express ON core.terminal
  FOR SELECT TO app_express USING (true);

CREATE TABLE pii.contato_pedagogico (
  avaliacao_pedagogica_id UUID PRIMARY KEY
    REFERENCES core.avaliacao_pedagogica_completa (id) ON DELETE CASCADE,
  canal_contato VARCHAR(10),
  valor_contato VARCHAR(100) NOT NULL,
  consentimento BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_contato_pedagogico_canal CHECK (
    canal_contato IS NULL OR canal_contato IN ('WHATSAPP', 'PHONE')
  )
);

-- A tela anterior não registrava autorização explícita para esse telefone.
-- Preserve os valores legados em pii, sem afirmar consentimento retrospectivo.
INSERT INTO pii.contato_pedagogico (
  avaliacao_pedagogica_id, canal_contato, valor_contato, consentimento, criado_em
)
SELECT id, canal_contato, valor_contato, FALSE, criado_em
FROM core.avaliacao_pedagogica_completa
WHERE valor_contato IS NOT NULL AND TRIM(valor_contato) <> '';

ALTER TABLE pii.contato_pedagogico ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pii.contato_pedagogico
  FROM PUBLIC, anon, authenticated, app_backend, app_bi, app_express;

CREATE OR REPLACE FUNCTION core.registrar_pedagogica(
  p_instituicao_nome          TEXT,
  p_rede                      TEXT,
  p_ciclos                    TEXT[],
  p_qtd_estudantes            INTEGER,
  p_nota_curriculo            INTEGER,
  p_avaliacao_mediadores      TEXT,
  p_avaliacao_materiais       TEXT,
  p_sugestoes                 TEXT DEFAULT NULL,
  p_interesse_visitas_futuras BOOLEAN DEFAULT FALSE,
  p_canal_contato             TEXT DEFAULT NULL,
  p_valor_contato             TEXT DEFAULT NULL,
  p_terminal_nome             TEXT DEFAULT 'Formulario Pedagogico Web'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pii, public
AS $$
DECLARE
  v_terminal_id UUID;
  v_avaliacao_id UUID;
  v_protocolo TEXT;
BEGIN
  IF NULLIF(TRIM(p_instituicao_nome), '') IS NULL THEN
    RAISE EXCEPTION 'Nome da instituicao e obrigatorio.';
  END IF;
  IF p_ciclos IS NULL OR array_length(p_ciclos, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione pelo menos um ciclo de ensino.';
  END IF;

  SELECT id INTO v_terminal_id
  FROM core.terminal WHERE nome = p_terminal_nome LIMIT 1;
  IF v_terminal_id IS NULL THEN
    SELECT id INTO v_terminal_id
    FROM core.terminal WHERE tipo = 'FORMULARIO_WEB' LIMIT 1;
  END IF;

  v_protocolo := core.gerar_protocolo('PED');

  INSERT INTO core.avaliacao_pedagogica_completa (
    instituicao_nome, rede, ciclos, qtd_estudantes,
    nota_curriculo, avaliacao_mediadores, avaliacao_materiais,
    sugestoes, interesse_visitas_futuras, protocolo, terminal_id
  ) VALUES (
    TRIM(p_instituicao_nome), UPPER(p_rede), p_ciclos, p_qtd_estudantes,
    p_nota_curriculo, UPPER(p_avaliacao_mediadores), UPPER(p_avaliacao_materiais),
    NULLIF(TRIM(p_sugestoes), ''), COALESCE(p_interesse_visitas_futuras, FALSE),
    v_protocolo, v_terminal_id
  ) RETURNING id INTO v_avaliacao_id;

  IF p_interesse_visitas_futuras = TRUE
     AND NULLIF(TRIM(p_canal_contato), '') IS NOT NULL
     AND NULLIF(TRIM(p_valor_contato), '') IS NOT NULL THEN
    INSERT INTO pii.contato_pedagogico (
      avaliacao_pedagogica_id, canal_contato, valor_contato, consentimento
    ) VALUES (
      v_avaliacao_id, UPPER(TRIM(p_canal_contato)),
      TRIM(p_valor_contato), TRUE
    );
  END IF;

  RETURN jsonb_build_object(
    'protocol', v_protocolo,
    'evaluatedAt', now()
  );
END;
$$;

ALTER TABLE core.avaliacao_pedagogica_completa
  DROP COLUMN canal_contato,
  DROP COLUMN valor_contato;
