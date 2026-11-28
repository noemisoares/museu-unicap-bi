# Museu UNICAP BI

Sistema de coleta digital de dados e Business Intelligence para o **Museu de Arqueologia e Ciências Naturais da UNICAP**.

## Arquitetura

- **`frontend/`**: Aplicação **Angular 22** (standalone components, signals, Signal Forms) integrada diretamente ao **Supabase**, preparada para deploy na **Vercel**.
  - `/check-in` — Check-in de visitantes no totem de recepção (com emissão de protocolo e consentimento LGPD opcional).
  - `/avaliacao` — Pesquisa de satisfação anônima no totem de saída.
  - `/pedagogico` — Avaliação pedagógica pós-visita para docentes.
  - `/login` e `/admin/dashboard` — Portal de gestão protegido por autenticação Supabase Auth + validação de perfil administrador (`core.is_admin()`).
- **`supabase/`**: Migrations SQL, configuração (`config.toml`), políticas RLS, isolamento de dados pessoais (`pii` vs `core`) e RPCs `SECURITY DEFINER`.
- **`database/`**: Documentação e scripts SQL históricos de modelagem do banco.
- **`.github/workflows/supabase-deploy.yml`**: Workflow manual (`workflow_dispatch`) para deploy das migrations no Supabase remoto.

Consulte [frontend/README.md](frontend/README.md) e [supabase/README.md](supabase/README.md) para instruções detalhadas de configuração e deploy.
