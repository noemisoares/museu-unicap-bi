# Museu UNICAP BI — Frontend (Angular 22)

Aplicação web do **Espaço Cultural e Museu de Arqueologia e Ciências Naturais da UNICAP**, construída com **Angular 22** (componentes standalone, signals e Signal Forms) e integrada diretamente ao **Supabase** (PostgreSQL, Auth, RLS e RPCs `SECURITY DEFINER`), com deploy estático/SPA na **Vercel**.

---

## Rotas da Aplicação

| Rota | Finalidade |
| --- | --- |
| `/` | Redireciona para `/check-in` |
| `/check-in` | Check-in no totem de recepção (tipo de visita, perfil, origem, contato LGPD opcional e protocolo) |
| `/avaliacao` | Pesquisa de satisfação anônima no totem de saída (nota 1–5 + tópicos carregados de `core.topico`) |
| `/pedagogico` | Avaliação pedagógica pós-visita para docentes (assistente em 3 etapas) |
| `/login` | Autenticação do Portal de Gestão via Supabase Auth |
| `/admin/dashboard` | Dashboard analítico protegido por `adminGuard` e validação de perfil administrador no banco (`core.is_admin()`) |

---

## Pré-requisitos

- **Node.js** `>= 22.22.3` (recomendado para `ng build` / `ng serve` / `ng test` do Angular CLI 22.2.x; a Vercel usa versão compatível automaticamente)
- **npm** `>= 10.x`

---

## Configuração de Ambiente

1. Copie `.env.example` para `.env` dentro de `front/museum-unicap/`:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=sua-chave-publica-anon-ou-publishable-aqui
TERMINAL_ID=Check-in Recepcao
```

2. Nunca utilize `service_role` ou senhas no frontend.
3. Os scripts `npm start` e `npm run build` executam automaticamente `scripts/inject-env.mjs` (`prestart` / `prebuild`), que gera `public/env.js` (ignorado pelo Git) com `window.__ENV__`. Na Vercel, configure `SUPABASE_URL`, `SUPABASE_ANON_KEY` e opcionalmente `TERMINAL_ID` nas variáveis de ambiente do projeto (com **Root Directory** em `front/museum-unicap`).

---

## Estrutura do Projeto

```text
front/museum-unicap/
├── scripts/
│   └── inject-env.mjs        # Injeta variáveis de ambiente em public/env.js
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── constants/    # Opções de domínio (faixa etária, vínculo, UF/cidades)
│   │   │   ├── models/       # Interfaces TypeScript
│   │   │   └── services/     # supabase.client.ts e serviços por domínio
│   │   ├── features/         # check-in, satisfaction, pedagogical, login, admin
│   │   ├── shared/           # Componentes reutilizáveis (app-modal)
│   │   └── testing/          # Helpers de DOM para testes de componentes
│   └── environments/         # Configurações lendo globalThis.__ENV__
├── .env.example              # Modelo de variáveis sem segredos
├── vercel.json               # Rewrites SPA e headers de segurança/cache
├── vitest.config.ts          # Configuração do Vitest
└── vitest.setup.ts           # Bootstrap Angular JIT para testes unitários
```

---

## Scripts Disponíveis

| Comando | Descrição |
| --- | --- |
| `npm install` | Instala dependências |
| `npm start` | Gera `public/env.js` e inicia `ng serve` em `http://localhost:4200` |
| `npm run build` | Gera `public/env.js` e executa `ng build` de produção em `dist/` |
| `npm test` | Executa os testes via Angular CLI (`ng test`) |
| `npx vitest run` | Executa a suíte unitária diretamente via Vitest |
| `npx tsc --noEmit -p tsconfig.app.json` | Verifica tipagem da aplicação |
