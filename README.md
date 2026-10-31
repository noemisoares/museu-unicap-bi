# Banco de Dados — Livro de Visitantes Digital (Museu UNICAP)

Task **MDADOS-0001 (#11)** — Modelagem relacional e documentação da arquitetura de dados.

## Conteúdo

| Arquivo | Descrição |
|---|---|
| `sql/01_schema.sql` | Schemas, tabelas, constraints, índices e função de revogação de consentimento |
| `sql/02_seed.sql` | Dados iniciais (terminais e tópicos). Ajuste os nomes com a equipe de mediação |
| `sql/03_views_bi.sql` | Views para o Power BI (esquema estrela) |
| `sql/04_roles_permissoes.sql` | Papéis `app_backend` e `app_bi` e permissões |
| `sql/05_validacao.sql` | Testes das restrições (roda em transação e faz rollback) |
| `docs/dicionario-de-dados.md` | Dicionário de Dados oficial |
| `docs/estrategia-separacao-dados-pessoais.md` | Estratégia LGPD para `contato` |
| `docs/adr-0001-arquitetura-de-dados.md` | Decisão arquitetural (SGBD, persistência, integração) |

## Pré-requisitos

- PostgreSQL **14 ou superior** (testado na 16). Em versões anteriores à 13, `gen_random_uuid()` exige a extensão `pgcrypto`.
- Cliente `psql` (ou outro cliente SQL; o script `05_validacao.sql` usa comandos do `psql`).
- Um usuário com permissão para criar banco, schemas e papéis (superusuário ou dono do banco).

## Configuração e execução

1. Criar o banco:

```bash
createdb -U postgres museu_unicap
```

2. Executar os scripts **na ordem**:

```bash
psql -U postgres -d museu_unicap -v ON_ERROR_STOP=1 -f sql/01_schema.sql
psql -U postgres -d museu_unicap -v ON_ERROR_STOP=1 -f sql/02_seed.sql
psql -U postgres -d museu_unicap -v ON_ERROR_STOP=1 -f sql/03_views_bi.sql
psql -U postgres -d museu_unicap -v ON_ERROR_STOP=1 -f sql/04_roles_permissoes.sql
```

3. Criar os usuários reais e associá-los aos papéis (troque as senhas):

```sql
CREATE ROLE usuario_backend LOGIN PASSWORD '...' IN ROLE app_backend;
CREATE ROLE usuario_bi      LOGIN PASSWORD '...' IN ROLE app_bi;
```

> `01_schema.sql` não é idempotente: rodá-lo duas vezes dá erro de "já existe". Os scripts 02, 03 e 04 podem ser reexecutados.

## Validação

```bash
psql -U postgres -d museu_unicap -f sql/05_validacao.sql
```

Resultado esperado: uma série de mensagens `NOTICE: OK: ...` e, no final:

```
VALIDACAO CONCLUIDA: todas as restricoes se comportaram como esperado.
```

Qualquer mensagem `TESTE FALHOU` indica restrição ausente ou incorreta. O script roda dentro de uma transação e termina em `ROLLBACK`, então não deixa dados de teste no banco.

Verificações manuais rápidas:

```sql
\dt core.*          -- 6 tabelas
\dt pii.*           -- 1 tabela (contato)
\dv core.*          -- 7 views
SELECT * FROM core.terminal;
SELECT * FROM core.topico;
```

## Recriar do zero (apenas desenvolvimento)

```sql
DROP SCHEMA IF EXISTS core CASCADE;
DROP SCHEMA IF EXISTS pii  CASCADE;
```

Depois execute novamente os scripts 01 a 04.
