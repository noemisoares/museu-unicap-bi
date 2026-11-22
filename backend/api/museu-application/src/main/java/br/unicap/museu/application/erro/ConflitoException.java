package br.unicap.museu.application.erro;

/** Ex.: totem ou tópico já registrado; contato já revogado. */
public class ConflitoException extends ExcecaoAplicacao {
    public ConflitoException(String mensagem) {
        super(CodigoErro.CONFLITO, mensagem);
    }
}
