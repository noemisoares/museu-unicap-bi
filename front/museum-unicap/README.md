# MuseumUnicap

Front-end para o sistema de **acervo digital e BI do Espaço Cultural e Museu da UNICAP**, construído com Angular 22 (componentes standalone, signals e Signal Forms).

---

## Rotas da Aplicação

| Rota | Finalidade |
| --- | --- |
| `/check-in` | Check-in no totem de recepção (tipo de visita, perfil do visitante, origem, contato LGPD opcional) |
| `/avaliacao` | Pesquisa de satisfação anônima no totem de saída (avaliação 1–5 + tópicos opcionais da API) |
| `/pedagogico` | Relatório pedagógico pós-visita para professores (assistente de 3 etapas) |
| `/login` | Login no portal de gestão (apenas barreira de UX; autenticação real é responsabilidade do back-end) |
| `/admin/dashboard` | Dashboard de gestão com indicadores de visitas, satisfação e relatórios pedagógicos |

## API Simulada (apenas desenvolvimento)

Até que o back-end institucional esteja disponível, o `MockApiInterceptor` (nome autoexplicativo) simula os endpoints MVP documentados quando `environment.useMockApi` está habilitado (`environment.development.ts`). Ele gera protocolos, timestamps do servidor e respostas de validação exatamente como a API real deveria fazer, e a interface exibe um badge "dados simulados" enquanto está ativo. Builds de produção **nunca** ativam o mock.

Endpoints MVP documentados usados pelo front-end:

- `POST /api/v1/checkins`
- `POST /api/v1/avaliacoes-satisfacao`
- `GET /api/v1/topicos-satisfacao`
- `POST /api/v1/avaliacoes-pedagogicas`
- `GET /api/v1/health`

Propostos (pendentes de confirmação do back-end): `POST /api/v1/auth/login`, `GET /api/v1/dashboard/resumo` e `GET /api/v1/dashboard/contatos`.

## Estrutura do Projeto

```
src/app/
  core/        models, listas de opções de domínio, serviços HTTP e mock interceptor
  shared/      primitivas de UI reutilizáveis (modal acessível)
  features/    check-in, satisfaction, pedagogical, login e admin (rotas lazy)
  testing/     helpers de DOM para specs de componentes
```

Tokens de design e primitivas compartilhadas (botões, chips, cards, inputs) ficam em `src/styles.scss`, extraídos do design system do protótipo (`PROTÓTIPO/espa_o_cultural_unicap_touch_experience/DESIGN.md`).

## Servidor de Desenvolvimento

Para iniciar um servidor de desenvolvimento local, execute:

```bash
ng serve
```

Uma vez que o servidor estiver rodando, abra o navegador e acesse `http://localhost:4200/`. A aplicação recarregará automaticamente sempre que você modificar qualquer arquivo fonte.

## Geração de Código (Scaffolding)

O Angular CLI inclui ferramentas poderosas de geração de código. Para gerar um novo componente, execute:

```bash
ng generate component component-name
```

Para uma lista completa de schematics disponíveis (como `components`, `directives`, ou `pipes`), execute:

```bash
ng generate --help
```

## Build

Para fazer o build do projeto, execute:

```bash
ng build
```

Isso compilará seu projeto e armazenará os artefatos na pasta `dist/`. Por padrão, o build de produção otimiza sua aplicação para performance e velocidade.

## Executando Testes Unitários

Para executar testes unitários com o test runner [Vitest](https://vitest.dev/), use o comando:

```bash
ng test
```

## Executando Testes End-to-End

Para testes end-to-end (e2e), execute:

```bash
ng e2e
```

O Angular CLI não vem com um framework de testes e2e por padrão. Você pode escolher um que atenda às suas necessidades.

## Recursos Adicionais

Para mais informações sobre o uso do Angular CLI, incluindo referências detalhadas de comandos, visite a página [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).

---

# museum-unicap

Front-end para o sistema de **acervo digital e BI do Espaço Cultural e Museu da UNICAP**, construído com Angular 22 (componentes standalone, signals e Signal Forms).

## 📋 Pré-requisitos

| Ferramenta | Versão |
|------------|--------|
| **Node.js** | ≥ 20.x (recomendado) |
| **npm** | ≥ 10.x (vem com Node.js) |
| **Angular CLI** | Instalado localmente via `npx` ou globalmente com `npm install -g @angular/cli` |

O projeto usa **Angular 22** com componentes standalone, signals e Signal Forms.

## 🚀 Instalação e Execução

```bash
# 1. Acesse o diretório do projeto
cd /home/willianrodrigues/Documents/Projeto\ de\ Gerenciamento/museu-unicap-bi/Museu-Unicap/museum-unicap

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm start
# ou equivalentemente:
npx ng serve
```

> O script `npm start` executa `ng serve` com a configuração **development** (usa `environment.development.ts` com a Mock API habilitada).

## 🌐 Acessando a Aplicação

Após iniciar o servidor (geralmente em `http://localhost:4200`), acesse as rotas:

| Rota | Descrição | Finalidade |
|------|-----------|------------|
| `/` | **Redireciona para `/check-in`** | Ponto de entrada |
| `/check-in` | **Check-in no Totem de Recepção** | Cadastro de visitante: tipo de visita, perfil, origem, contato LGPD opcional |
| `/avaliacao` | **Pesquisa de Satisfação no Totem de Saída** | Avaliação anônima 1–5 + tópicos opcionais |
| `/pedagogico` | **Relatório Pedagógico Pós-Visita** | Assistente de 3 etapas para professores |
| `/login` | **Portal de Gestão - Login** | Apenas barreira de UX (autenticação real é responsabilidade do back-end) |
| `/admin/dashboard` | **Dashboard de Gestão** | Indicadores de visitas, satisfação e relatórios pedagógicos (protegido por guard) |

> **Nota:** Todas as rotas de features usam **lazy loading** via `loadComponent` / `loadChildren`.

## 🔧 Scripts npm Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia servidor dev em `localhost:4200` (hot reload) |
| `npm run build` | Build de produção → pasta `dist/` |
| `npm run watch` | Build em modo watch (config development) |
| `npm test` | Executa testes unitários com **Vitest** |

## ⚙️ Detalhes de Configuração Importantes

### Mock API (Apenas Desenvolvimento)
- Habilitado via `environment.useMockApi = true` em `environment.development.ts`
- Simula endpoints MVP: `POST /api/v1/checkins`, `POST /api/v1/avaliacoes-satisfacao`, `GET /api/v1/topicos-satisfacao`, `POST /api/v1/avaliacoes-pedagogicas`, `GET /api/v1/health`
- Exibe badge "dados simulados" na interface
- **Nunca ativo em builds de produção**

### Estrutura do Projeto
```
src/app/
├── core/         # models, services, mock interceptor, domain options
├── shared/       # UI reutilizável (modal acessível)
├── features/     # check-in, satisfaction, pedagogical, login, admin (rotas lazy)
└── testing/      # helpers de DOM para specs
```

## ✅ Verificação Rápida

Após rodar `npm start`, abra o navegador e verifique:
1. **Redirecionamento automático** para `http://localhost:4200/check-in`
2. Formulário de check-in carrega (UI do totem de recepção)
3. Navegue manualmente para outras rotas: `/avaliacao`, `/pedagogico`, `/login`
4. Para `/admin/dashboard`, passe antes por `/login` (barreira de UX)

---


