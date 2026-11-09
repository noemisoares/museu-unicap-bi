# Contrato da API

`openapi.yaml` descreve, em OpenAPI 3.0, as rotas que o totem (visitante) e o painel (gestor) vão consumir.
É um **rascunho para alinhar com o front-end**; a seção "Pontos em aberto" dentro do arquivo lista o que ainda precisa de decisão.

## Como visualizar
- Colar o conteúdo em <https://editor.swagger.io>, ou
- Extensão "OpenAPI (Swagger) Editor" no VS Code, ou
- Plugin "OpenAPI Specifications" no IntelliJ.

## Quando mudar
Alterou rota, campo ou código de erro? Atualize o `openapi.yaml` no mesmo PR da implementação.
Assim o front sempre tem a versão certa para consultar.

## Rotas já implementadas
- `GET /api/v1/health`

As demais seguem como contrato até a implementação de cada task.
