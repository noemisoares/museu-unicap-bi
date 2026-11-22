package br.unicap.museu.application.log;

/** Eventos que o fluxo do sistema manda registrar ("Registrar log"). */
public enum TipoEvento {
    FALHA_AUTENTICACAO,
    FALHA_SALVAR_VISITACAO,
    FALHA_VIEW,
    FALHA_INTEGRACAO,
    ACESSO_CONTATO,
    ERRO_INTERNO
}
