# Publicação da API Express

O banco é o projeto Supabase `argssawsehdkexbskmos`. A URL HTTP e a chave
publicável do Supabase usadas pelo Angular não substituem `DATABASE_URL` nem
autorizam a aplicação de migrações.

## Preparação do banco

1. Confira no projeto de produção quais migrações de `supabase/migrations`
   estão aplicadas. A migração `20261127000003_express_integration.sql` requer
   as duas migrações anteriores de 2026-11-27. Aplique apenas as pendentes,
   depois de conferir o estado real do banco.
2. Crie um usuário PostgreSQL com senha própria e participação no papel
   `app_express`, sem usar a conta `postgres` na API. Guarde a senha apenas no
   gerenciador de segredos do projeto Vercel. A migração cria o papel e suas
   permissões; não cria usuário nem armazena senha.
3. Copie a URI **Transaction pooler** do painel Supabase, porta `6543`, para
   `DATABASE_URL`. O host da `.env.example` veio do projeto existente; confirme
   no painel antes de usá-lo. Baixe a CA do projeto e forneça seu PEM por
   `DB_CA_CERT` (Vercel) ou `DB_CA_CERT_PATH` (local). Não use
   `DB_SSL_MODE=disable` em produção.
4. Nas configurações da Data API do Supabase, inclua `core` nos schemas expostos
   para o login e o painel Angular. Em 2026-11-27, uma consulta pública à API
   de produção retornou `PGRST106: Invalid schema: core`; o valor em
   `supabase/config.toml` configura o ambiente local, não confirma a opção
   aplicada no projeto hospedado. Preserve as políticas RLS e concessões
   administrativas existentes.

## Projetos Vercel

1. Crie um projeto para o Express com raiz `backend`, runtime Node compatível
   com `package.json` e as variáveis `DATABASE_URL` e `DB_CA_CERT`. O ponto de
   entrada é `src/server.js`. Verifique `GET /api/v1/saude` e
   `GET /api/v1/topicos` antes de configurar o front.
2. No projeto Angular com raiz `front/museum-unicap`, configure
   `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `API_ORIGIN` com a origem HTTPS estável
   do projeto Express (sem barra final). `vercel.mjs` encaminha `/api/v1/*`
   antes da rota da aplicação e falha a configuração se `API_ORIGIN` faltar.
3. Teste em preview os três formulários, o login e o painel. Confira que o
   check-in usa o terminal de entrada, a avaliação de satisfação usa o de
   saída e o contato pedagógico autorizado fica apenas em `pii`.
4. Após a publicação do novo front e a saída de circulação dos clientes antigos,
   execute manualmente `supabase/cutover/revoke_public_form_rpcs.sql`. Esse
   arquivo fica fora de `migrations` para evitar revogação prematura. Confirme
   que as três rotas Express continuam registrando dados após o corte.

O ambiente local usa o proxy do Angular para `http://127.0.0.1:3000`. Execute
`npm start` em `backend` e em `front/museum-unicap`, cada um em seu diretório.
O Angular usa `front/museum-unicap/.env`, ignorado pelo Git; o Express usa
`backend/.env`, também ignorado.
