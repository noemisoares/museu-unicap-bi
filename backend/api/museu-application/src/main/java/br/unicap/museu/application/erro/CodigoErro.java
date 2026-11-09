package br.unicap.museu.application.erro;

/** Códigos de erro estáveis, usados pela API na resposta e por quem consome o sistema. */
public enum CodigoErro {
    DADO_INVALIDO,
    RECURSO_NAO_ENCONTRADO,
    CONFLITO,
    ACESSO_NEGADO,
    FALHA_INTEGRACAO,
    ERRO_INTERNO
}
