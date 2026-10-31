# Estratégia de Separação dos Dados Pessoais (LGPD)

**Task:** MDADOS-0001 (#11) · **Requisito:** RNF06 — Privacidade · **Versão:** 1.0 (rascunho para revisão)

> Este documento descreve a estratégia técnica adotada no banco. Base legal, prazos de retenção e o texto do termo de consentimento devem ser validados pelo museu e pelo encarregado de dados (DPO) da UNICAP. O autor não é advogado.

## 1. Objetivo

Garantir que dados pessoais de visitantes (nome, e-mail, WhatsApp) fiquem isolados dos registros estatísticos de visitação, e que o consentimento seja registrado e possa ser revogado.

## 2. Quais dados pessoais existem

| Dado | Onde fica | Observação |
|---|---|---|
| nome, e-mail, WhatsApp | `pii.contato` | Única tabela com dados pessoais no modelo |
| Estatísticas de visita (turno, origem por bairro/cidade, quantidade) | `core.visitacao` | Sem identificação direta |
| Notas e comentários | `core.avaliacao_*` | O **comentário em texto livre pode conter dado pessoal** digitado pelo visitante (ver seção 7) |

## 3. Estratégia de separação

1. **Separação lógica por schema:** `pii` guarda `contato`; `core` guarda todo o restante. Os dois ficam no mesmo banco (decisão do MVP), mas com permissões independentes.
2. **Vínculo unidirecional:** `pii.contato.visitacao_id` aponta para `core.visitacao.id`. A visitação **não** tem coluna que aponte para o contato. Assim, qualquer análise de `core` nunca precisa tocar dados pessoais.
3. **Cardinalidade 1:0..1:** `UNIQUE (visitacao_id)` garante no máximo um contato por visita. Visita sem contato simplesmente não tem linha em `pii.contato`.
4. **Permissões por papel:**

| Papel | `core` | `pii` |
|---|---|---|
| `app_backend` | leitura e escrita | leitura e escrita; pode executar `pii.revogar_consentimento` |
| `app_bi` | somente as views `vw_*` | **sem acesso** |

5. **Views de BI sem dados pessoais:** nenhuma view lê `pii.contato`, e o campo `comentario` não é exposto.

## 4. Gestão de consentimento

Cada linha de `pii.contato` carrega:

| Campo | Função |
|---|---|
| `consentimento` | `TRUE` = ativo, `FALSE` = revogado |
| `finalidade_consentimento` | Finalidade informada ao titular (ex.: "relacionamento pós-visita") |
| `data_consentimento` | Quando o titular consentiu |
| `data_revogacao` | Quando revogou (nula enquanto ativo) |

Regras impostas pelo banco (`CHECK`):
- Só se cria contato com consentimento ativo e ao menos um meio de contato (e-mail ou WhatsApp).
- Consentimento ativo ⇒ `data_revogacao` nula. Revogado ⇒ `data_revogacao` obrigatória e `>= data_consentimento`.
- Revogado ⇒ `nome`, `email` e `whatsapp` obrigatoriamente nulos.
- Formato validado: e-mail e WhatsApp em E.164 (`+5581999999999`).

**Versão do termo:** o modelo atual não guarda a versão do texto aceito. Se o museu alterar o termo ao longo do tempo, recomenda-se adicionar a coluna `versao_termo` (ver pendências).

## 5. Revogação e direitos do titular

| Direito | Como atender |
|---|---|
| Revogar o consentimento | `SELECT pii.revogar_consentimento('<id_do_contato>');` anonimiza nome, e-mail e WhatsApp, marca `consentimento = FALSE` e preenche `data_revogacao`. A visitação e as avaliações permanecem (dados estatísticos sem identificação) |
| Acesso / confirmação | Consulta a `pii.contato` pelo identificador, feita pelo backend |
| Correção | `UPDATE` em `pii.contato`, feito pelo backend |
| Eliminação | `DELETE FROM pii.contato WHERE id = ...`; a visitação permanece, sem vínculo com a pessoa |

## 6. Minimização e finalidade

- Coleta somente do necessário para o contato pós-visita: nome (opcional), e-mail e/ou WhatsApp.
- A origem geográfica é coletada em nível de bairro/cidade, sem endereço completo.
- Os dados de `pii` não devem ser usados para outra finalidade sem novo consentimento.
- Campos pessoais não entram em nenhuma view de BI.

## 7. Riscos e cuidados

| Risco | Mitigação |
|---|---|
| Comentário livre com dado pessoal | Aviso no formulário/totem ("não informe dados pessoais"); campo fora das views de BI; acesso restrito ao backend |
| Reidentificação cruzando visita e contato | Acesso ao schema `pii` restrito; BI sem acesso |
| Visitantes menores de idade | Em grupos escolares não se coleta contato dos alunos; o contato, quando existe, é do docente ou responsável adulto |
| Vazamento do banco | Criptografia em repouso e em trânsito (TLS) na infraestrutura; backups protegidos (ver ADR) |

## 8. Pendências para decisão do museu / DPO

1. Texto do termo de consentimento e base legal aplicada.
2. **Prazo de retenção** dos contatos (por quanto tempo manter e quando anonimizar).
3. Se haverá registro da **versão do termo** (`versao_termo`).
4. Se o nome do docente que responde à avaliação pedagógica deve ser guardado (hoje não é).
