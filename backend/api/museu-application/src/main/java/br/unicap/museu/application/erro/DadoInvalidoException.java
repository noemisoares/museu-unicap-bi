package br.unicap.museu.application.erro;

/** Dado informado não passou na validação de negócio. */
public class DadoInvalidoException extends ExcecaoAplicacao {
    public DadoInvalidoException(String mensagem) {
        super(CodigoErro.DADO_INVALIDO, mensagem);
    }
}
