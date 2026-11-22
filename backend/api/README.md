# museu-unicap-bi — Backend

Backend em Java do livro de visitantes digital do Museu de Arqueologia e Ciências Naturais da UNICAP.

> **Estado atual (Task 10):** apenas a estrutura. Não há regras de negócio nem funcionalidades específicas.
> O único endpoint é `GET /api/v1/health`, usado para validar que a aplicação inicia.

## Arquitetura em camadas

Cada camada é um módulo Maven. A direção das dependências é imposta pelo build: se um módulo importar
algo que não deveria, **não compila**.

```
museu-api  ──►  museu-infrastructure  ──►  museu-application  ──►  museu-domain
   │                                              ▲
   └──────────────────────────────────────────────┘
```

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `museu-domain` | Entidades, objetos de valor, regras de negócio puras. Sem framework. | nada |
| `museu-application` | Casos de uso e portas (interfaces) de repositório/log. | domain |
| `museu-infrastructure` | Adaptadores: PostgreSQL, views `app_admin` (somente leitura), logs persistidos. | application |
| `museu-api` | Controllers REST, configuração, ponto de entrada (`MuseuApplication`). | application, infrastructure |

Regras:
- `domain` nunca importa Spring, JDBC ou HTTP.
- `application` define as **interfaces**; `infrastructure` as **implementa** (inversão de dependência).
- `api` só chama casos de uso da `application`; não acessa o banco diretamente.

## Pré-requisitos

- JDK 21
- Maven 3.9+
- Docker (opcional, para subir o PostgreSQL local)

```bash
java -version
mvn -version
```

## Instalação

```bash
git clone <url-do-repositorio>
cd museu-unicap-bi
cp .env.example .env     # ajuste os valores; o .env não é versionado
```

## Execução

1. (Opcional) subir o PostgreSQL local:
   ```bash
   docker compose --env-file .env up -d
   ```
2. Compilar e instalar os módulos (roda também os testes):
   ```bash
   mvn clean install
   ```
3. Carregar as variáveis do `.env` e iniciar a API (o `-am` **não** deve ser usado aqui):
   ```powershell
   # Windows (PowerShell)
   Get-Content .env | Where-Object { $_ -match '^\s*[^#\s].*=' } | ForEach-Object {
       $nome, $valor = $_ -split '=', 2
       Set-Item -Path "Env:$($nome.Trim())" -Value $valor.Trim()
   }
   mvn -pl museu-api spring-boot:run
   ```
   ```bash
   # Linux/macOS
   set -a; source .env; set +a
   mvn -pl museu-api spring-boot:run
   ```

## Validação

1. **Compila e passa nos testes:**
   ```bash
   mvn clean verify
   ```
2. **Inicia:** a aplicação deve subir na porta `8080` sem erros no log.
3. **Responde:**
   ```bash
   curl http://localhost:8080/api/v1/health
   # {"status":"UP"}
   ```

## Erros e logs (RF27)

- **Erros da API** seguem um formato único (`ErroResposta`): `timestamp`, `status`, `codigo`, `mensagem`, `caminho` e, em validação, `campos`.
  Os casos de uso lançam exceções da Application (`RecursoNaoEncontradoException`, `ConflitoException`,
  `DadoInvalidoException`, `AcessoNegadoException`, `FalhaIntegracaoException`) e o `GlobalExceptionHandler`
  as converte em 404, 409, 400, 403 e 503. Qualquer outra exceção vira 500 com mensagem genérica.
- **Logs** passam pela porta `RegistroLogPort` (Application). Toda mensagem é mascarada antes de ser registrada:
  e-mails, números longos (telefone, CPF) e valores de senha/token nunca vão para o log.
- Por enquanto o adaptador (`RegistroLogSlf4j`) grava no log da aplicação. Quando a tabela de log existir (task 11),
  entra um adaptador que grava no PostgreSQL, sem alterar nenhum caso de uso.

## Configuração segura

- Nenhuma credencial fica no código. Banco e porta vêm de variáveis de ambiente (`.env.example` lista todas).
- `.env` está no `.gitignore`.
- Nesta fase a aplicação **inicia mesmo sem banco** (`hikari.initialization-fail-timeout: -1`); a conexão só é aberta no primeiro uso.

## Próximos passos (fora do escopo da Task 10)

Modelagem do banco (Task 11), infraestrutura transversal (log, erros, autenticação) e demais fluxos.
