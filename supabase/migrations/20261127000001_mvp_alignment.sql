-- =============================================================================
-- 20261127000001_mvp_alignment.sql
-- Alinha a modelagem do banco com os formulários do frontend Angular MVP.
--
-- Alterações:
-- 1. Adiciona faixa_etaria, vinculo_institucional e protocolo a core.visitacao
-- 2. Expande tipo_visita para incluir FAMILIA e ACADEMICO e remove obrigatoriedade
--    de instituicao_id no check-in de totem escolar
-- 3. Reestrutura satisfação para permitir avaliação sem tópico (tabela ponte N:N)
-- 4. Cria core.avaliacao_pedagogica_completa com todos os campos do formulário
-- 5. Adiciona icon à tabela core.topico e garante catálogo completo
-- 6. Cria tabela core.admin_usuario e função core.is_admin() (autorização segura)
-- 7. Cria funções RPC transacionais para check-in, satisfação, pedagógico e admin
-- 8. Configura RLS e GRANTS mínimos (pii nunca exposto diretamente ao frontend)
--
-- NÃO DESTRUTIVO: apenas ADD COLUMN, ADD CONSTRAINT, CREATE TABLE, CREATE FUNCTION.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. core.visitacao — novos campos e ajustes para o check-in MVP
-- ---------------------------------------------------------------------------

ALTER TABLE core.visitacao
  ADD COLUMN IF NOT EXISTS faixa_etaria VARCHAR(10);

ALTER TABLE core.visitacao
  ADD COLUMN IF NOT EXISTS vinculo_institucional VARCHAR(15);

ALTER TABLE core.visitacao
  ADD COLUMN IF NOT EXISTS protocolo VARCHAR(30);

ALTER TABLE core.visitacao DROP CONSTRAINT IF EXISTS ck_visitacao_tipo_visita;
ALTER TABLE core.visitacao ADD CONSTRAINT ck_visitacao_tipo_visita CHECK (
  tipo_visita IN ('INDIVIDUAL', 'FAMILIA', 'GRUPO_ESCOLAR', 'ACADEMICO', 'GRUPO_OUTRO')
);

-- No totem de check-in, o visitante escolar não seleciona instituicao_id prévia
ALTER TABLE core.visitacao DROP CONSTRAINT IF EXISTS ck_visitacao_escolar_exige_instituicao;

ALTER TABLE core.visitacao DROP CONSTRAINT IF EXISTS ck_visitacao_faixa_etaria;
ALTER TABLE core.visitacao ADD CONSTRAINT ck_visitacao_faixa_etaria CHECK (
  faixa_etaria IS NULL OR faixa_etaria IN ('CRIANCA', 'JOVEM', 'ADULTO', 'SENIOR')
);

ALTER TABLE core.visitacao DROP CONSTRAINT IF EXISTS ck_visitacao_vinculo_institucional;
ALTER TABLE core.visitacao ADD CONSTRAINT ck_visitacao_vinculo_institucional CHECK (
  vinculo_institucional IS NULL OR vinculo_institucional IN ('COMUNIDADE', 'ALUNO', 'PROFESSOR', 'EGRESSO')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitacao_protocolo
  ON core.visitacao (protocolo) WHERE protocolo IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. core.avaliacao_satisfacao — reestruturar para MVP
-- ---------------------------------------------------------------------------

ALTER TABLE core.avaliacao_satisfacao ALTER COLUMN topico_id DROP NOT NULL;

ALTER TABLE core.avaliacao_satisfacao
  ADD COLUMN IF NOT EXISTS protocolo VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS idx_avaliacao_satisfacao_protocolo
  ON core.avaliacao_satisfacao (protocolo) WHERE protocolo IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Tabela ponte para tópicos de satisfação (N:N)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS core.avaliacao_satisfacao_topico (
  avaliacao_satisfacao_id UUID NOT NULL,
  topico_id               UUID NOT NULL,
  CONSTRAINT pk_avaliacao_satisfacao_topico PRIMARY KEY (avaliacao_satisfacao_id, topico_id),
  CONSTRAINT fk_ast_avaliacao FOREIGN KEY (avaliacao_satisfacao_id)
    REFERENCES core.avaliacao_satisfacao (id) ON DELETE CASCADE,
  CONSTRAINT fk_ast_topico FOREIGN KEY (topico_id)
    REFERENCES core.topico (id)
);

CREATE INDEX IF NOT EXISTS idx_ast_topico_id ON core.avaliacao_satisfacao_topico (topico_id);

-- ---------------------------------------------------------------------------
-- 4. core.avaliacao_pedagogica_completa — tabela expandida para o MVP
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS core.avaliacao_pedagogica_completa (
  id                        UUID         NOT NULL DEFAULT gen_random_uuid(),
  visitacao_id              UUID,
  instituicao_nome          VARCHAR(200) NOT NULL,
  rede                      VARCHAR(20)  NOT NULL,
  ciclos                    TEXT[]       NOT NULL,
  qtd_estudantes            INTEGER      NOT NULL,
  nota_curriculo            SMALLINT     NOT NULL,
  avaliacao_mediadores      VARCHAR(20)  NOT NULL,
  avaliacao_materiais       VARCHAR(20)  NOT NULL,
  sugestoes                 TEXT,
  interesse_visitas_futuras BOOLEAN      NOT NULL DEFAULT FALSE,
  canal_contato             VARCHAR(10),
  valor_contato             VARCHAR(100),
  protocolo                 VARCHAR(30),
  terminal_id               UUID,
  criado_em                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT pk_avaliacao_pedagogica_completa PRIMARY KEY (id),
  CONSTRAINT fk_apc_visitacao FOREIGN KEY (visitacao_id)
    REFERENCES core.visitacao (id),
  CONSTRAINT fk_apc_terminal FOREIGN KEY (terminal_id)
    REFERENCES core.terminal (id),
  CONSTRAINT ck_apc_rede CHECK (
    rede IN ('ESTADUAL', 'MUNICIPAL', 'PRIVADA', 'FEDERAL')
  ),
  CONSTRAINT ck_apc_nota_curriculo CHECK (nota_curriculo BETWEEN 1 AND 5),
  CONSTRAINT ck_apc_avaliacao_mediadores CHECK (
    avaliacao_mediadores IN ('EXCELENTE', 'MUITO_BOM', 'REGULAR', 'INSUFICIENTE')
  ),
  CONSTRAINT ck_apc_avaliacao_materiais CHECK (
    avaliacao_materiais IN ('ADEQUADO', 'INADEQUADO', 'NAO_UTILIZADO')
  ),
  CONSTRAINT ck_apc_canal_contato CHECK (
    canal_contato IS NULL OR canal_contato IN ('WHATSAPP', 'PHONE')
  ),
  CONSTRAINT ck_apc_qtd_estudantes CHECK (qtd_estudantes >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apc_protocolo
  ON core.avaliacao_pedagogica_completa (protocolo) WHERE protocolo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_apc_criado_em
  ON core.avaliacao_pedagogica_completa (criado_em);

-- ---------------------------------------------------------------------------
-- 5. Adicionar icon à tabela de tópicos (para servir ao frontend)
-- ---------------------------------------------------------------------------

ALTER TABLE core.topico
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

UPDATE core.topico SET icon = 'history_edu' WHERE nome = 'Experiencia geral' AND icon IS NULL;
UPDATE core.topico SET icon = 'support_agent' WHERE nome = 'Mediacao' AND icon IS NULL;
UPDATE core.topico SET icon = 'emoji_people' WHERE nome = 'Acolhimento' AND icon IS NULL;
UPDATE core.topico SET icon = 'museum' WHERE nome = 'Estrutura e exposicao' AND icon IS NULL;
UPDATE core.topico SET icon = 'menu_book' WHERE nome = 'Aderencia ao curriculo' AND icon IS NULL;
UPDATE core.topico SET icon = 'description' WHERE nome = 'Material de apoio' AND icon IS NULL;

INSERT INTO core.topico (nome, descricao, tipo, icon) VALUES
  ('Acervo Historico',       'Acervo historico do museu.',                           'SATISFACAO', 'history_edu'),
  ('Acessibilidade',         'Acessibilidade do espaco.',                            'SATISFACAO', 'accessible_forward'),
  ('Climatizacao',           'Climatizacao do ambiente.',                            'SATISFACAO', 'ac_unit'),
  ('Iluminacao das Obras',   'Iluminacao das obras e exposicoes.',                   'SATISFACAO', 'wb_incandescent'),
  ('Arquitetura do Predio',  'Arquitetura patrimonial do predio.',                   'SATISFACAO', 'architecture'),
  ('Curadoria Pedagogica',   'Curadoria pedagogica e textos informativos.',          'SATISFACAO', 'menu_book'),
  ('Sinalizacao das Rotas',  'Sinalizacao e rotas de visitacao.',                    'SATISFACAO', 'signpost')
ON CONFLICT (nome) DO UPDATE SET icon = EXCLUDED.icon;

-- ---------------------------------------------------------------------------
-- 6. Controle de administradores (não editável pelo próprio usuário)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS core.admin_usuario (
  user_id    UUID        NOT NULL,
  email      VARCHAR(254),
  nome       VARCHAR(150),
  role       VARCHAR(30) NOT NULL DEFAULT 'gestao',
  ativo      BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_admin_usuario PRIMARY KEY (user_id)
);

COMMENT ON TABLE core.admin_usuario IS
  'Lista explicita de administradores autorizados. Gerenciada apenas via SQL/service_role no Supabase.';

CREATE OR REPLACE FUNCTION core.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, auth, public
AS $$
  SELECT
    auth.role() = 'service_role'
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'gestao'), FALSE)
    OR EXISTS (
      SELECT 1
        FROM core.admin_usuario au
       WHERE au.user_id = auth.uid()
         AND au.ativo = TRUE
    );
$$;

-- ---------------------------------------------------------------------------
-- 7. Função auxiliar para gerar protocolo único
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.gerar_protocolo(prefixo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_ano TEXT;
  v_seq TEXT;
BEGIN
  v_ano := to_char(now(), 'YYYY');
  v_seq := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
  RETURN prefixo || '-' || v_ano || '-' || v_seq;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Função RPC para registrar check-in completo (transacional)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.registrar_checkin(
  p_tipo_visita         TEXT,
  p_qtd_visitantes      INTEGER,
  p_faixa_etaria        TEXT,
  p_vinculo             TEXT,
  p_uf                  TEXT,
  p_cidade              TEXT,
  p_bairro              TEXT DEFAULT NULL,
  p_terminal_nome       TEXT DEFAULT 'Check-in Recepcao',
  p_contato_nome        TEXT DEFAULT NULL,
  p_contato_email       TEXT DEFAULT NULL,
  p_contato_whatsapp    TEXT DEFAULT NULL,
  p_consentimento       BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pii, public
AS $$
DECLARE
  v_terminal_id   UUID;
  v_visitacao_id  UUID;
  v_protocolo     TEXT;
  v_turno         TEXT;
  v_data_hora     TIMESTAMPTZ;
  v_tipo          TEXT;
  v_uf            CHAR(2);
  v_pais          VARCHAR(60);
  v_email         VARCHAR(254);
  v_digits        TEXT;
  v_whatsapp      VARCHAR(20);
BEGIN
  IF p_qtd_visitantes IS NULL OR p_qtd_visitantes < 1 THEN
    RAISE EXCEPTION 'Quantidade de visitantes deve ser maior que zero.';
  END IF;

  SELECT id INTO v_terminal_id FROM core.terminal WHERE nome = p_terminal_nome LIMIT 1;
  IF v_terminal_id IS NULL THEN
    SELECT id INTO v_terminal_id FROM core.terminal WHERE tipo = 'CHECKIN' LIMIT 1;
  END IF;
  IF v_terminal_id IS NULL THEN
    RAISE EXCEPTION 'Terminal nao encontrado: %', p_terminal_nome;
  END IF;

  v_data_hora := now();
  v_turno := CASE
    WHEN extract(hour FROM v_data_hora AT TIME ZONE 'America/Recife') < 12 THEN 'MANHA'
    WHEN extract(hour FROM v_data_hora AT TIME ZONE 'America/Recife') < 18 THEN 'TARDE'
    ELSE 'NOITE'
  END;

  v_protocolo := core.gerar_protocolo('CHK');

  v_tipo := CASE LOWER(p_tipo_visita)
    WHEN 'individual' THEN 'INDIVIDUAL'
    WHEN 'familia'    THEN 'FAMILIA'
    WHEN 'escola'     THEN 'GRUPO_ESCOLAR'
    WHEN 'academico'  THEN 'ACADEMICO'
    ELSE UPPER(p_tipo_visita)
  END;

  -- Trata UF = 'OUTRO' (CHAR(2) exige 2 letras maiusculas ou NULL)
  IF p_uf IS NOT NULL AND UPPER(TRIM(p_uf)) ~ '^[A-Z]{2}$' THEN
    v_uf := UPPER(TRIM(p_uf));
    v_pais := 'Brasil';
  ELSE
    v_uf := NULL;
    v_pais := 'Outro / Internacional';
  END IF;

  INSERT INTO core.visitacao (
    terminal_id, turno, data_hora, tipo_visita, qtd_visitantes,
    faixa_etaria, vinculo_institucional, bairro, cidade, uf, pais, protocolo
  ) VALUES (
    v_terminal_id, v_turno, v_data_hora, v_tipo, p_qtd_visitantes,
    UPPER(p_faixa_etaria), UPPER(p_vinculo),
    NULLIF(TRIM(p_bairro), ''), NULLIF(TRIM(p_cidade), ''),
    v_uf, v_pais, v_protocolo
  )
  RETURNING id INTO v_visitacao_id;

  -- Normaliza e persiste contato em pii.contato apenas se houver consentimento explicito
  v_email := NULLIF(TRIM(p_contato_email), '');
  v_digits := ltrim(regexp_replace(COALESCE(p_contato_whatsapp, ''), '[^0-9]', '', 'g'), '0');
  IF length(v_digits) BETWEEN 10 AND 11 THEN
    v_whatsapp := '+55' || v_digits;
  ELSIF length(v_digits) BETWEEN 8 AND 15 THEN
    v_whatsapp := '+' || v_digits;
  ELSE
    v_whatsapp := NULL;
  END IF;

  IF p_consentimento = TRUE AND (v_email IS NOT NULL OR v_whatsapp IS NOT NULL) THEN
    INSERT INTO pii.contato (
      visitacao_id, nome, email, whatsapp,
      consentimento, finalidade_consentimento, data_consentimento
    ) VALUES (
      v_visitacao_id,
      NULLIF(TRIM(p_contato_nome), ''),
      v_email,
      v_whatsapp,
      TRUE,
      'Comunicacao pos-visita e relacionamento',
      v_data_hora
    );
  END IF;

  UPDATE core.terminal SET ultimo_acesso = v_data_hora WHERE id = v_terminal_id;

  RETURN jsonb_build_object(
    'protocol', v_protocolo,
    'checkedInAt', v_data_hora,
    'visitationId', v_visitacao_id
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. Função RPC para registrar avaliação de satisfação
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.registrar_satisfacao(
  p_nota            INTEGER,
  p_topico_ids      UUID[] DEFAULT '{}',
  p_terminal_nome   TEXT DEFAULT 'Totem Saida 01'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_terminal_id  UUID;
  v_avaliacao_id UUID;
  v_protocolo    TEXT;
  v_tid          UUID;
BEGIN
  IF p_nota IS NULL OR p_nota < 1 OR p_nota > 5 THEN
    RAISE EXCEPTION 'A nota de satisfacao deve ser entre 1 e 5.';
  END IF;

  SELECT id INTO v_terminal_id FROM core.terminal WHERE nome = p_terminal_nome LIMIT 1;
  IF v_terminal_id IS NULL THEN
    SELECT id INTO v_terminal_id FROM core.terminal WHERE tipo = 'TOTEM_SAIDA' LIMIT 1;
  END IF;
  IF v_terminal_id IS NULL THEN
    RAISE EXCEPTION 'Terminal nao encontrado: %', p_terminal_nome;
  END IF;

  v_protocolo := core.gerar_protocolo('SAT');

  INSERT INTO core.avaliacao_satisfacao (
    terminal_id, topico_id, nota_likert, protocolo
  ) VALUES (
    v_terminal_id, NULL, p_nota, v_protocolo
  )
  RETURNING id INTO v_avaliacao_id;

  IF array_length(p_topico_ids, 1) IS NOT NULL THEN
    FOREACH v_tid IN ARRAY p_topico_ids LOOP
      INSERT INTO core.avaliacao_satisfacao_topico (avaliacao_satisfacao_id, topico_id)
      VALUES (v_avaliacao_id, v_tid)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'protocol', v_protocolo,
    'evaluatedAt', now()
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. Função RPC para registrar avaliação pedagógica
-- ---------------------------------------------------------------------------

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
SET search_path = core, public
AS $$
DECLARE
  v_terminal_id UUID;
  v_protocolo   TEXT;
BEGIN
  IF NULLIF(TRIM(p_instituicao_nome), '') IS NULL THEN
    RAISE EXCEPTION 'Nome da instituicao e obrigatorio.';
  END IF;
  IF p_ciclos IS NULL OR array_length(p_ciclos, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione pelo menos um ciclo de ensino.';
  END IF;

  SELECT id INTO v_terminal_id FROM core.terminal WHERE nome = p_terminal_nome LIMIT 1;
  IF v_terminal_id IS NULL THEN
    SELECT id INTO v_terminal_id FROM core.terminal WHERE tipo = 'FORMULARIO_WEB' LIMIT 1;
  END IF;

  v_protocolo := core.gerar_protocolo('PED');

  INSERT INTO core.avaliacao_pedagogica_completa (
    instituicao_nome, rede, ciclos, qtd_estudantes,
    nota_curriculo, avaliacao_mediadores, avaliacao_materiais,
    sugestoes, interesse_visitas_futuras,
    canal_contato, valor_contato, protocolo, terminal_id
  ) VALUES (
    TRIM(p_instituicao_nome), UPPER(p_rede), p_ciclos, p_qtd_estudantes,
    p_nota_curriculo, UPPER(p_avaliacao_mediadores), UPPER(p_avaliacao_materiais),
    NULLIF(TRIM(p_sugestoes), ''), COALESCE(p_interesse_visitas_futuras, FALSE),
    CASE WHEN NULLIF(TRIM(p_canal_contato), '') IS NOT NULL THEN UPPER(TRIM(p_canal_contato)) ELSE NULL END,
    NULLIF(TRIM(p_valor_contato), ''), v_protocolo, v_terminal_id
  );

  RETURN jsonb_build_object(
    'protocol', v_protocolo,
    'evaluatedAt', now()
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 11. Função RPC protegida para listar contatos (LGPD) sem expor schema pii
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.listar_contatos_admin(
  p_page      INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 4
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pii, public
AS $$
DECLARE
  v_total     INTEGER;
  v_offset    INTEGER;
  v_safe_page INTEGER;
  v_items     JSONB;
BEGIN
  IF NOT core.is_admin() THEN
    RAISE EXCEPTION 'Acesso nao autorizado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT count(*)::INTEGER INTO v_total
    FROM pii.contato c
   WHERE c.consentimento = TRUE;

  v_safe_page := GREATEST(1, COALESCE(p_page, 1));
  v_offset := (v_safe_page - 1) * GREATEST(1, COALESCE(p_page_size, 4));

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT
      c.id,
      COALESCE(c.nome, 'Visitante') AS name,
      CASE v.tipo_visita
        WHEN 'GRUPO_ESCOLAR' THEN 'Grupo Escolar • ' || v.qtd_visitantes || ' pessoas'
        WHEN 'FAMILIA'       THEN 'Família • ' || v.qtd_visitantes || ' pessoas'
        WHEN 'ACADEMICO'     THEN 'Pesquisa / Cultural'
        ELSE 'Visita individual'
      END AS detail,
      CASE v.tipo_visita
        WHEN 'GRUPO_ESCOLAR' THEN 'docente'
        WHEN 'FAMILIA'       THEN 'familia'
        WHEN 'ACADEMICO'     THEN 'pesquisa'
        ELSE 'individual'
      END AS category,
      COALESCE(c.whatsapp, '') AS phone,
      COALESCE(c.email, '') AS email,
      TRIM(
        COALESCE(v.cidade, 'Não informado') ||
        CASE WHEN v.bairro IS NOT NULL THEN ' (' || v.bairro || ')' ELSE '' END
      ) AS origin,
      COALESCE(v.data_hora, c.criado_em) AS "checkedInAt",
      c.consentimento AS consent
    FROM pii.contato c
    LEFT JOIN core.visitacao v ON v.id = c.visitacao_id
    WHERE c.consentimento = TRUE
    ORDER BY c.criado_em DESC
    LIMIT GREATEST(1, COALESCE(p_page_size, 4))
    OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', v_safe_page,
    'pageSize', GREATEST(1, COALESCE(p_page_size, 4))
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 12. Função RPC protegida para contagem de opt-in LGPD no dashboard
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.contar_contatos_optin(
  p_inicio TIMESTAMPTZ DEFAULT NULL,
  p_fim    TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pii, public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT core.is_admin() THEN
    RAISE EXCEPTION 'Acesso nao autorizado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT count(*)::INTEGER INTO v_count
    FROM pii.contato c
   WHERE c.consentimento = TRUE
     AND (p_inicio IS NULL OR c.criado_em >= p_inicio)
     AND (p_fim IS NULL OR c.criado_em < p_fim);

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 13. Views BI atualizadas
-- ---------------------------------------------------------------------------

-- Nota: em PostgreSQL, CREATE OR REPLACE VIEW exige preservar a ordem e os nomes
-- das colunas existentes, acrescentando novas colunas apenas ao final.
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
  COALESCE(v.pais, 'Brasil')             AS pais,
  v.protocolo,
  v.faixa_etaria,
  v.vinculo_institucional
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
  a.criado_em::date                      AS data_avaliacao,
  a.protocolo
FROM core.avaliacao_satisfacao a;

CREATE OR REPLACE VIEW core.vw_fato_avaliacao_pedagogica AS
SELECT
  apc.id                                 AS avaliacao_pedagogica_id,
  apc.protocolo,
  apc.instituicao_nome,
  apc.rede,
  apc.ciclos,
  apc.qtd_estudantes,
  apc.nota_curriculo,
  apc.avaliacao_mediadores,
  apc.avaliacao_materiais,
  apc.interesse_visitas_futuras,
  apc.criado_em,
  apc.criado_em::date                    AS data_avaliacao
FROM core.avaliacao_pedagogica_completa apc;

CREATE OR REPLACE VIEW core.vw_dashboard_resumo AS
SELECT
  count(*)                                                                        AS total_visitas,
  coalesce(sum(qtd_visitantes), 0)                                                AS total_visitantes,
  count(DISTINCT CASE WHEN tipo_visita = 'GRUPO_ESCOLAR' THEN instituicao_id END) AS escolas_atendidas,
  coalesce(sum(CASE WHEN tipo_visita = 'GRUPO_ESCOLAR' THEN qtd_visitantes ELSE 0 END), 0) AS estudantes_mediados
FROM core.visitacao;

CREATE OR REPLACE VIEW core.vw_dashboard_satisfacao AS
SELECT
  count(*)                                                             AS total_avaliacoes,
  round(avg(nota_likert)::numeric, 1)                                  AS media_nota,
  round(100.0 * count(*) FILTER (WHERE nota_likert >= 4) / NULLIF(count(*), 0), 1) AS pct_positivo
FROM core.avaliacao_satisfacao
WHERE nota_likert IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 14. Grants mínimos para anon e authenticated
-- ---------------------------------------------------------------------------

REVOKE ALL ON SCHEMA pii FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA pii FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA core TO anon, authenticated;

-- Funções RPC públicas (coleta nos totens e formulário web)
GRANT EXECUTE ON FUNCTION core.registrar_checkin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION core.registrar_satisfacao TO anon, authenticated;
GRANT EXECUTE ON FUNCTION core.registrar_pedagogica TO anon, authenticated;
GRANT EXECUTE ON FUNCTION core.gerar_protocolo TO anon, authenticated;

-- Funções RPC administrativas
GRANT EXECUTE ON FUNCTION core.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION core.listar_contatos_admin TO authenticated;
GRANT EXECUTE ON FUNCTION core.contar_contatos_optin TO authenticated;

-- Leitura pública apenas do catálogo de tópicos e terminais
GRANT SELECT ON core.topico TO anon, authenticated;
GRANT SELECT ON core.terminal TO anon, authenticated;
GRANT SELECT ON core.instituicao TO anon, authenticated;

-- Leitura administrativa das tabelas/views de core (protegida por RLS is_admin())
GRANT SELECT ON core.visitacao TO authenticated;
GRANT SELECT ON core.avaliacao_satisfacao TO authenticated;
GRANT SELECT ON core.avaliacao_satisfacao_topico TO authenticated;
GRANT SELECT ON core.avaliacao_pedagogica_completa TO authenticated;
GRANT SELECT ON core.vw_dashboard_resumo TO authenticated;
GRANT SELECT ON core.vw_dashboard_satisfacao TO authenticated;
GRANT SELECT ON core.vw_fato_visitacao TO authenticated;
GRANT SELECT ON core.vw_fato_satisfacao TO authenticated;
GRANT SELECT ON core.vw_fato_avaliacao_pedagogica TO authenticated;
GRANT SELECT ON core.vw_dim_escola TO authenticated;
GRANT SELECT ON core.vw_dim_terminal TO authenticated;
GRANT SELECT ON core.vw_dim_topico TO authenticated;
GRANT SELECT ON core.vw_dim_geografia TO authenticated;

-- ---------------------------------------------------------------------------
-- 15. RLS — Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE core.visitacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.avaliacao_satisfacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.avaliacao_satisfacao_topico ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.avaliacao_pedagogica_completa ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.topico ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.terminal ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.instituicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.admin_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii.contato ENABLE ROW LEVEL SECURITY;

-- Catálogos públicos
DROP POLICY IF EXISTS topico_select_public ON core.topico;
CREATE POLICY topico_select_public ON core.topico
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS terminal_select_public ON core.terminal;
CREATE POLICY terminal_select_public ON core.terminal
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS instituicao_select_public ON core.instituicao;
CREATE POLICY instituicao_select_public ON core.instituicao
  FOR SELECT TO anon, authenticated USING (true);

-- Dados analíticos: apenas administradores autenticados
DROP POLICY IF EXISTS visitacao_select_admin ON core.visitacao;
CREATE POLICY visitacao_select_admin ON core.visitacao
  FOR SELECT TO authenticated USING (core.is_admin());

DROP POLICY IF EXISTS satisfacao_select_admin ON core.avaliacao_satisfacao;
CREATE POLICY satisfacao_select_admin ON core.avaliacao_satisfacao
  FOR SELECT TO authenticated USING (core.is_admin());

DROP POLICY IF EXISTS satisfacao_topico_select_admin ON core.avaliacao_satisfacao_topico;
CREATE POLICY satisfacao_topico_select_admin ON core.avaliacao_satisfacao_topico
  FOR SELECT TO authenticated USING (core.is_admin());

DROP POLICY IF EXISTS pedagogica_select_admin ON core.avaliacao_pedagogica_completa;
CREATE POLICY pedagogica_select_admin ON core.avaliacao_pedagogica_completa
  FOR SELECT TO authenticated USING (core.is_admin());

DROP POLICY IF EXISTS admin_usuario_select_self ON core.admin_usuario;
CREATE POLICY admin_usuario_select_self ON core.admin_usuario
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- PII: nenhuma policy SELECT para anon ou authenticated direto;
-- acesso exclusivamente via funções SECURITY DEFINER que validam core.is_admin().
DROP POLICY IF EXISTS contato_select_none ON pii.contato;
CREATE POLICY contato_select_none ON pii.contato
  FOR SELECT TO authenticated USING (false);

COMMENT ON FUNCTION core.is_admin IS 'Verifica se o usuario autenticado e administrador autorizado (via app_metadata.role ou core.admin_usuario).';
COMMENT ON FUNCTION core.registrar_checkin IS 'RPC transacional para check-in. Acessivel publicamente. Normaliza telefone/UF, calcula turno, gera protocolo e insere visitacao e contato (se consentido).';
COMMENT ON FUNCTION core.registrar_satisfacao IS 'RPC para avaliacao de satisfacao anonima. Insere avaliacao e topicos selecionados.';
COMMENT ON FUNCTION core.registrar_pedagogica IS 'RPC para avaliacao pedagogica pos-visita. Insere todos os campos do formulario.';
COMMENT ON FUNCTION core.listar_contatos_admin IS 'RPC protegida por core.is_admin() para listar contatos LGPD no painel administrativo sem expor o schema pii.';
