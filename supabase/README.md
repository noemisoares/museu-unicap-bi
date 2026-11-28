# Infraestrutura Supabase — Museu UNICAP BI

O projeto utiliza o **Supabase** como backend e banco de dados oficial do MVP:
- **PostgreSQL** (`core` para dados operacionais/analíticos e `pii` isolado para dados pessoais LGPD).
- **Supabase Auth** para autenticação do Portal de Gestão.
- **RPC (`SECURITY DEFINER`) + RLS** para coleta pública segura (sem exposição de dados de outros visitantes) e consultas administrativas restritas.

## 1. Schemas expostos na Data API

No painel do Supabase (**Project Settings → Data API → Exposed schemas**):
- Inclua: `public`, `core`
- **NÃO exponha** o schema `pii` na Data API. O acesso a `pii.contato` é feito exclusivamente por funções `SECURITY DEFINER` (`core.registrar_checkin`, `core.listar_contatos_admin`, `core.contar_contatos_optin`) que validam consentimento LGPD e privilégios administrativos (`core.is_admin()`).

## 2. Migrations

Ordem de execução em `supabase/migrations/`:
1. `20261106000001_schema.sql` — Estrutura base (`core` e `pii`)
2. `20261106000002_seed.sql` — Catálogos iniciais (terminais e tópicos)
3. `20261106000003_views_bi.sql` — Views dimensionais e fato para BI
4. `20261106000004_roles_permissoes.sql` — Papéis base
5. `20261127000001_mvp_alignment.sql` — Alinhamento com formulários MVP, RPCs transacionais, `core.admin_usuario`, `core.is_admin()`, RLS e grants mínimos.

## 3. Como cadastrar e autorizar o primeiro administrador

Por segurança, usuários não podem conceder privilégios administrativos a si mesmos via `user_metadata`. A autorização é verificada pela função `core.is_admin()`, que consulta a tabela `core.admin_usuario` (e `app_metadata.role`).

1. No painel do Supabase, acesse **Authentication → Users → Add user → Create new user**.
2. Informe o e-mail institucional e uma senha forte (recomenda-se marcar **Auto Confirm User**).
3. Copie o **User UID** (UUID) gerado para esse usuário.
4. No **SQL Editor** do Supabase, execute (substituindo os valores):

```sql
INSERT INTO core.admin_usuario (user_id, email, nome, role, ativo)
VALUES (
  'UUID-DO-USUARIO-AQUI',
  'admin@unicap.br',
  'Curadoria & Mediação',
  'gestao',
  TRUE
)
ON CONFLICT (user_id) DO UPDATE
SET ativo = TRUE, role = EXCLUDED.role;
```

5. A partir desse momento, o usuário poderá acessar `/login` e entrar no `/admin/dashboard`.
