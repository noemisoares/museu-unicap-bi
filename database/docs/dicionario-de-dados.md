# Dicionário de Dados — Livro de Visitantes Digital (Museu UNICAP)

**Task:** MDADOS-0001 (#11) · **SGBD:** PostgreSQL 14+ · **Versão:** 1.0 (rascunho para revisão)

## 1. Convenções (RNF11)

| Item | Regra |
|---|---|
| Nomes | `snake_case`, sem acentos, tabelas no singular |
| Chave primária | `id`, tipo `UUID`, gerada pelo banco (`gen_random_uuid()`) |
| Chave estrangeira | `<entidade>_id` (ex.: `terminal_id`) |
| Data e hora | `TIMESTAMPTZ` (com fuso) |
| Textos | `VARCHAR(n)` para valores curtos, `TEXT` para texto livre |
| Domínios fechados | `VARCHAR` + `CHECK` (mais simples de evoluir que `ENUM`) |
| Constraints | nomeadas: `pk_`, `fk_`, `uq_`, `ck_`; índices: `idx_` |
| Schemas | `core` (dados operacionais) e `pii` (dados pessoais, acesso restrito) |

## 2. Visão geral das entidades

| Tabela | Schema | Descrição |
|---|---|---|
| `instituicao` | core | Escolas e outras instituições visitantes |
| `terminal` | core | Pontos de coleta (check-in, totem, formulário web) |
| `topico` | core | Catálogo de assuntos avaliados |
| `visitacao` | core | Registro de cada visita (sem dados pessoais) |
| `avaliacao_satisfacao` | core | Respostas do totem de saída |
| `avaliacao_pedagogica` | core | Avaliação dos docentes sobre visitas escolares |
| `contato` | **pii** | Dados pessoais de contato e consentimento |

## 3. Tabelas

### 3.1 `core.instituicao`

| Campo | Tipo | Obrigatório | Chave | Restrições | Descrição |
|---|---|---|---|---|---|
| id | UUID | Sim | PK | `pk_instituicao`; padrão `gen_random_uuid()` | Identificador da instituição |
| nome | VARCHAR(200) | Sim | | `uq_instituicao_nome_cidade_uf` (nome, cidade, uf) | Nome da instituição |
| rede | VARCHAR(10) | Sim | | `PUBLICA` ou `PRIVADA` | Rede de ensino (dimensão Escolas) |
| nivel_ensino | VARCHAR(30) | Não | | `INFANTIL`, `FUNDAMENTAL`, `MEDIO`, `SUPERIOR`, `OUTRO` | Nível de ensino |
| cidade | VARCHAR(100) | Não | | | Cidade da instituição |
| uf | CHAR(2) | Não | | Duas letras maiúsculas | Estado |
| criado_em | TIMESTAMPTZ | Sim | | Padrão `now()` | Data de cadastro |

### 3.2 `core.terminal`

| Campo | Tipo | Obrigatório | Chave | Restrições | Descrição |
|---|---|---|---|---|---|
| id | UUID | Sim | PK | `pk_terminal` | Identificador do terminal |
| nome | VARCHAR(100) | Sim | | `uq_terminal_nome` (único) | Nome do terminal. Ex.: "Totem Saída 01" |
| tipo | VARCHAR(20) | Sim | | `CHECKIN`, `TOTEM_SAIDA`, `FORMULARIO_WEB` | Função do terminal |
| localizacao | VARCHAR(150) | Não | | | Onde está instalado |
| status | VARCHAR(15) | Sim | | `ATIVO`, `INATIVO`, `MANUTENCAO`; padrão `ATIVO` | Situação operacional |
| ultimo_acesso | TIMESTAMPTZ | Não | | | Última atividade registrada (monitoramento) |

### 3.3 `core.topico`

| Campo | Tipo | Obrigatório | Chave | Restrições | Descrição |
|---|---|---|---|---|---|
| id | UUID | Sim | PK | `pk_topico` | Identificador do tópico |
| nome | VARCHAR(100) | Sim | | `uq_topico_nome` (único) | Nome. Ex.: "Mediação", "Acolhimento" |
| descricao | TEXT | Não | | | Descrição do que o tópico avalia |
| tipo | VARCHAR(15) | Sim | | `SATISFACAO`, `PEDAGOGICA`, `AMBOS` | Em qual avaliação o tópico pode ser usado |
| ativo | BOOLEAN | Sim | | Padrão `TRUE` | Se o tópico está em uso |
| criado_em | TIMESTAMPTZ | Sim | | Padrão `now()` | Data de cadastro |

### 3.4 `core.visitacao`

| Campo | Tipo | Obrigatório | Chave | Restrições | Descrição |
|---|---|---|---|---|---|
| id | UUID | Sim | PK | `pk_visitacao`; `uq_visitacao_id_instituicao` (id, instituicao_id) | Identificador da visita |
| terminal_id | UUID | Sim | FK → terminal.id | `fk_visitacao_terminal` | Terminal em que o check-in foi feito |
| instituicao_id | UUID | Não | FK → instituicao.id | `fk_visitacao_instituicao`; obrigatório se `tipo_visita = GRUPO_ESCOLAR` | Instituição do grupo (se houver) |
| turno | VARCHAR(10) | Sim | | `MANHA`, `TARDE`, `NOITE` | Turno da visita (ocupação por turno) |
| data_hora | TIMESTAMPTZ | Sim | | | Data e hora da entrada |
| tipo_visita | VARCHAR(20) | Sim | | `INDIVIDUAL`, `GRUPO_ESCOLAR`, `GRUPO_OUTRO` | Perfil da visita |
| qtd_visitantes | INTEGER | Sim | | `>= 1`; padrão `1` | Número de pessoas |
| bairro | VARCHAR(100) | Não | | | Origem do visitante: bairro |
| cidade | VARCHAR(100) | Não | | | Origem do visitante: cidade |
| uf | CHAR(2) | Não | | Duas letras maiúsculas | Origem do visitante: estado |
| pais | VARCHAR(60) | Não | | | Origem do visitante: país |
| criado_em | TIMESTAMPTZ | Sim | | Padrão `now()` | Data de criação do registro |

> Não há nenhum dado pessoal identificável nesta tabela (RNF06).

### 3.5 `pii.contato`

| Campo | Tipo | Obrigatório | Chave | Restrições | Descrição |
|---|---|---|---|---|---|
| id | UUID | Sim | PK | `pk_contato` | Identificador do contato |
| visitacao_id | UUID | Sim | FK → core.visitacao.id | `fk_contato_visitacao`; `uq_contato_visitacao` (único) | Visita a que o contato se refere (no máximo 1 por visita) |
| nome | VARCHAR(150) | Não | | Nulo se consentimento revogado | Nome do visitante |
| email | VARCHAR(254) | Não | | Formato de e-mail; nulo se revogado | E-mail para contato pós-visita |
| whatsapp | VARCHAR(20) | Não | | Formato E.164 (`+5581999999999`); nulo se revogado | WhatsApp para contato pós-visita |
| consentimento | BOOLEAN | Sim | | `TRUE` com consentimento ativo; `FALSE` se revogado | Situação do consentimento |
| finalidade_consentimento | VARCHAR(100) | Sim | | | Finalidade informada ao titular |
| data_consentimento | TIMESTAMPTZ | Sim | | | Quando o consentimento foi dado |
| data_revogacao | TIMESTAMPTZ | Não | | Nula se `consentimento = TRUE`; obrigatória se `FALSE`; `>= data_consentimento` | Quando foi revogado |
| criado_em | TIMESTAMPTZ | Sim | | Padrão `now()` | Data de criação do registro |

Regras: com consentimento ativo, é obrigatório ter e-mail **ou** WhatsApp. Com consentimento revogado, `nome`, `email` e `whatsapp` devem estar nulos.

### 3.6 `core.avaliacao_satisfacao`

| Campo | Tipo | Obrigatório | Chave | Restrições | Descrição |
|---|---|---|---|---|---|
| id | UUID | Sim | PK | `pk_avaliacao_satisfacao` | Identificador da resposta |
| visitacao_id | UUID | Não | FK → visitacao.id | `fk_avaliacao_satisfacao_visitacao` | Visita avaliada. Opcional porque o totem pode ser anônimo |
| terminal_id | UUID | Sim | FK → terminal.id | `fk_avaliacao_satisfacao_terminal` | Totem em que foi respondida |
| topico_id | UUID | Sim | FK → topico.id | `fk_avaliacao_satisfacao_topico` | Tópico avaliado |
| nota_likert | SMALLINT | Não | | 1 a 5 | Nota na escala Likert |
| nota_nps | SMALLINT | Não | | 0 a 10 | Nota de recomendação (base do NPS) |
| comentario | TEXT | Não | | | Texto livre (pode conter dado pessoal digitado pelo visitante) |
| criado_em | TIMESTAMPTZ | Sim | | Padrão `now()` | Data e hora da resposta |

Regra: ao menos uma entre `nota_likert` e `nota_nps` deve estar preenchida.

### 3.7 `core.avaliacao_pedagogica`

| Campo | Tipo | Obrigatório | Chave | Restrições | Descrição |
|---|---|---|---|---|---|
| id | UUID | Sim | PK | `pk_avaliacao_pedagogica` | Identificador da resposta |
| visitacao_id | UUID | Sim | FK → visitacao.id | `fk_avaliacao_pedagogica_visitacao`; `uq_avaliacao_pedagogica_visitacao_topico` (visitacao_id, topico_id) | Visita escolar avaliada |
| instituicao_id | UUID | Sim | FK → instituicao.id | `fk_avaliacao_pedagogica_instituicao`; FK composta (visitacao_id, instituicao_id) → visitacao | Instituição do docente; deve ser a mesma da visita |
| topico_id | UUID | Sim | FK → topico.id | `fk_avaliacao_pedagogica_topico` | Aspecto avaliado |
| nota_likert | SMALLINT | Sim | | 1 a 5 | Nota na escala Likert |
| comentario | TEXT | Não | | | Avaliação qualitativa |
| criado_em | TIMESTAMPTZ | Sim | | Padrão `now()` | Data e hora da resposta |

## 4. Relacionamentos e cardinalidades

| Origem (pai) | Destino (filha) | Cardinalidade | Observação |
|---|---|---|---|
| terminal | visitacao | 1 : N | Todo check-in ocorre em um terminal |
| instituicao | visitacao | 0..1 : N | Visita individual não tem instituição |
| visitacao | contato | 1 : 0..1 | Garantido por `UNIQUE (visitacao_id)`; a visitação não referencia o contato |
| visitacao | avaliacao_satisfacao | 1 : 0..N | A avaliação pode ser anônima |
| terminal | avaliacao_satisfacao | 1 : N | |
| topico | avaliacao_satisfacao | 1 : N | |
| visitacao | avaliacao_pedagogica | 1 : 0..N | Uma linha por tópico |
| instituicao | avaliacao_pedagogica | 1 : N | |
| topico | avaliacao_pedagogica | 1 : N | |

## 5. Regras de negócio não garantidas pelo banco

O banco não impõe estas regras, que ficam sob responsabilidade do backend:

1. Usar em `avaliacao_satisfacao` somente tópicos com `tipo` = `SATISFACAO` ou `AMBOS`, e em `avaliacao_pedagogica` somente `PEDAGOGICA` ou `AMBOS`.
2. Avaliação pedagógica só para visitas com `tipo_visita = GRUPO_ESCOLAR`.
3. `terminal_id` de `avaliacao_satisfacao` deve ser um terminal do tipo `TOTEM_SAIDA`, e o de `visitacao` do tipo `CHECKIN`.
4. Texto livre (`comentario`) pode conter dado pessoal: tratar conforme o documento de estratégia LGPD.

## 6. Views para o Power BI (schema `core`)

| View | Papel no esquema estrela | Origem |
|---|---|---|
| `vw_fato_visitacao` | Fato Visitação | visitacao (+ geografia da instituição) |
| `vw_fato_satisfacao` | Fato Satisfação (inclui `classificacao_nps`) | avaliacao_satisfacao |
| `vw_fato_avaliacao_docente` | Fato Avaliação Docente | avaliacao_pedagogica |
| `vw_dim_escola` | Dimensão Escolas | instituicao |
| `vw_dim_geografia` | Dimensão Geografia | visitacao + instituicao |
| `vw_dim_terminal` | Dimensão Terminal | terminal |
| `vw_dim_topico` | Dimensão Tópico | topico |

A Dimensão Calendário é gerada no próprio Power BI. As views não expõem `pii.contato` nem o campo `comentario`.
