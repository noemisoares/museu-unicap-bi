package br.unicap.museu.application.erro;

/** Perfil sem autorização para a operação (ex.: gerenciar contatos). */
public class AcessoNegadoException extends ExcecaoAplicacao {
    public AcessoNegadoException(String mensagem) {
        super(CodigoErro.ACESSO_NEGADO, mensagem);
    }
}
