# Museu UNICAP BI

O **Museu UNICAP BI** é o sistema oficial de registro, avaliação, gestão e curadoria de informações relacionadas às atividades do **Museu de Arqueologia e Ciências Naturais da UNICAP**.

A plataforma centraliza a recepção de visitantes, a coleta de opiniões sobre a experiência no museu e o acompanhamento das visitas educativas em um ambiente digital único, oferecendo à equipe gestora dados organizados para apoiar decisões e ações institucionais.

**Endereço oficial em produção:** https://museu-unicap-bi.vercel.app/

---

## Acesse o sistema

Utilize os links diretos abaixo para acessar cada funcionalidade do sistema em produção:

### ⭐ PORTAL DE GESTÃO E CURADORIA
**Acesso direto:** https://museu-unicap-bi.vercel.app/login

Acesso à área administrativa do Museu UNICAP BI, destinada aos responsáveis pela gestão e curadoria das informações. O acesso ao painel é protegido por autenticação.

---

### Demais acessos

| Funcionalidade | Endereço direto | Descrição |
| --- | --- | --- |
| **REGISTRO DE VISITANTES** | https://museu-unicap-bi.vercel.app/check-in | Formulário para registrar a presença e as informações dos visitantes do museu. |
| **AVALIAÇÃO DE SATISFAÇÃO** | https://museu-unicap-bi.vercel.app/avaliacao | Formulário para coletar opiniões e avaliações dos visitantes sobre sua experiência no museu. |
| **AVALIAÇÃO PEDAGÓGICA** | https://museu-unicap-bi.vercel.app/pedagogico | Formulário destinado ao registro de avaliações pedagógicas relacionadas às atividades e experiências educativas do museu. |

---

## Sobre o sistema

O Museu UNICAP BI foi desenvolvido para simplificar a rotina do museu e transformar os registros diários em informações úteis para a instituição. Suas principais finalidades são:

- **Registro de visitantes:** contabilização de entradas e caracterização do público recebido no espaço cultural.
- **Coleta de avaliações de satisfação:** escuta contínua da percepção dos visitantes após a visita.
- **Registro de avaliações pedagógicas:** acompanhamento da experiência educativa de grupos, escolas e instituições de ensino.
- **Gestão e visualização de informações:** painel administrativo para consulta e acompanhamento dos dados registrados.
- **Organização de informações:** consolidação de indicadores para análise das atividades do museu.

---

## Organização e funcionamento

O sistema é dividido em duas frentes principais, integradas diretamente ao **Supabase**:

1. **Formulários públicos (`/check-in`, `/avaliacao` e `/pedagogico`):** disponibilizados para uso direto de visitantes e educadores, sem necessidade de login administrativo, enviando os registros de forma segura para o banco de dados.
2. **Área administrativa (`/login` e painel `/admin`):** o **Portal de Gestão e Curadoria** exige autenticação prévia e validação de permissão de administrador. O acesso ao painel **não é público**, garantindo proteção aos dados consolidados e às informações gerenciais do museu.

---

## Tecnologias utilizadas

- **Frontend:** Angular 22 (TypeScript, SCSS, RxJS) e Vitest para testes unitários.
- **Backend, Banco de Dados e Autenticação:** Supabase (PostgreSQL, Supabase Auth, Row Level Security e funções RPC).
- **Hospedagem e Publicação:** Vercel.
- **Automação de Banco de Dados:** GitHub Actions (workflow manual para aplicação de migrations do Supabase).

---

## Informações para desenvolvedores

### Pré-requisitos

- **Node.js** `>= 22.22.3`
- **npm** `>= 10.x`
- **Git**

### Instalação e execução local

1. Clone o repositório:

```bash
git clone https://github.com/noemisoares/museu-unicap-bi.git
cd museu-unicap-bi/frontend
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente copiando o arquivo modelo `.env.example` para `.env` dentro da pasta `frontend/`:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key-aqui
TERMINAL_ID=Check-in Recepcao
```

> Nunca utilize chaves privadas (`service_role`) ou senhas no frontend.

4. Execute a aplicação localmente:

```bash
npm start
```

A aplicação ficará disponível em `http://localhost:4200`.

### Publicação na Vercel

A publicação do frontend é realizada na **Vercel** com as seguintes configurações (definidas a partir da pasta `frontend/`):

- **Root Directory:** `frontend`
- **Install Command:** `npm install`
- **Build Command:** `npm run build`
- **Output Directory:** `dist/museum-unicap/browser`
- **Variáveis de ambiente na Vercel:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `TERMINAL_ID`
