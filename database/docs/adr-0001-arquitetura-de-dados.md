# ADR-0001 — Decisão Arquitetural de Dados

**Task:** MDADOS-0001 (#11) · **Status:** Proposto (aguardando validação da equipe) · **Data:** 31/10/2026

## 1. Contexto

O museu substituirá o livro de visitantes em papel por coleta digital em três pontos: check-in de entrada, totem de saída e formulário pedagógico pós-visita. Os dados alimentarão painéis em Power BI e precisam atender à LGPD. O MVP terá backend com rotas próprias (RF01 a RF27), e a visão do projeto cita Microsoft Forms/SharePoint (ou Google Forms/Sheets) como ecossistema de coleta e armazenamento.

Necessidades que orientam a decisão:
- Integridade referencial entre visitas, avaliações, instituições e terminais (RNF04).
- Separação dos dados pessoais (RNF06).
- Padronização para integração com o backend e o BI (RNF11).
- Baixo custo de manutenção.

## 2. Decisão

### 2.1 SGBD: PostgreSQL (14 ou superior)

### 2.2 Mecanismo de persistência
- Banco relacional PostgreSQL como **fonte única de verdade**.
- Dois schemas: `core` (operacional) e `pii` (dados pessoais).
- Chaves primárias `UUID` geradas pelo banco.
- Evolução do esquema por **migrations versionadas** (scripts numerados em `database/sql`; adotar Flyway ou Liquibase no backend quando a stack for definida).
- Backup periódico e criptografia em trânsito (TLS) e em repouso, a cargo da infraestrutura.

### 2.3 Estratégia de integração
- **Backend ↔ banco:** o backend é o único que escreve, via papel `app_backend`, usando as rotas da API. Os IDs `UUID` podem ser expostos na API sem revelar volume de registros.
- **Formulários e totens:** enviam dados à API do backend, que valida e grava. Formulários externos (Microsoft/Google Forms), se usados, entram por ingestão pelo backend e não escrevem direto no banco.
- **Power BI:** conecta ao PostgreSQL com o papel `app_bi`, que só lê as views `core.vw_*` (esquema estrela). Sem acesso ao schema `pii`.
- **Dimensão Calendário:** gerada no Power BI.

## 3. Alternativas consideradas

| Alternativa | Prós | Contras | Resultado |
|---|---|---|---|
| **PostgreSQL** | `UUID` nativo, schemas, `CHECK` robustos, TLS, conector Power BI, gratuito | Exige servidor/gerenciamento | **Escolhida** |
| MySQL 8 | Muito difundido, gratuito | Sem `UUID` nativo, sem schemas separados (separar por banco/usuário), `CHECK` só a partir da 8.0.16 | Descartada (viável com adaptações) |
| SQL Server | Integração natural com Power BI e Microsoft | Licenciamento, custo | Alternativa se a UNICAP já oferecer o serviço |
| SharePoint Lists / Excel / Sheets | Sem servidor, já citado na visão | Sem integridade referencial, difícil separar dados pessoais, limites de volume | Descartada como base principal |

## 4. Consequências

**Positivas:** integridade garantida pelo banco, LGPD tratada na estrutura (schemas e permissões), BI desacoplado do dado pessoal, modelo preparado para evolução.

**Negativas / riscos:**
- Requer um servidor PostgreSQL (próprio ou gerenciado) e rotina de backup.
- Se o museu exigir que os formulários gravem em SharePoint/Sheets, será necessário um processo de sincronização.
- Os dois schemas ficam na mesma instância: a separação é lógica (permissões), não física. Para separação física, mover `pii` para outro banco ou instância.

## 5. Pendências de validação

1. Confirmar PostgreSQL com a equipe e a infraestrutura da UNICAP (hospedagem, versão, backup).
2. Definir a ferramenta de migrations do backend.
3. Confirmar se os formulários serão próprios ou Microsoft/Google Forms.
