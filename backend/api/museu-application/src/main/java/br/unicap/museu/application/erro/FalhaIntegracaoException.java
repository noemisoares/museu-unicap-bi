package br.unicap.museu.application.erro;

/**
 * Falha ao falar com um recurso externo à aplicação (banco, views app_admin).
 * A causa original fica na exceção para diagnóstico, mas nunca é enviada ao cliente.
 */
public class FalhaIntegracaoException extends ExcecaoAplicacao {
    public FalhaIntegracaoException(String mensagem, Throwable causa) {
        super(CodigoErro.FALHA_INTEGRACAO, mensagem, causa);
    }
}
