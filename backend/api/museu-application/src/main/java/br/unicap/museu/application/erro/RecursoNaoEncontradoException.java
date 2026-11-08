package br.unicap.museu.application.erro;

/** Ex.: totem, tópico ou contato inexistente. */
public class RecursoNaoEncontradoException extends ExcecaoAplicacao {
    public RecursoNaoEncontradoException(String mensagem) {
        super(CodigoErro.RECURSO_NAO_ENCONTRADO, mensagem);
    }
}
