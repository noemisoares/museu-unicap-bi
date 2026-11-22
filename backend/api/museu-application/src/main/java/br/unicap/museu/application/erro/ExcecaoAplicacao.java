package br.unicap.museu.application.erro;

/**
 * Base das exceções esperadas pelos casos de uso (ex.: "totem já registrado", "contato não existe").
 *
 * <p>A mensagem é exibida ao cliente da API, então deve ser escrita pensando nisso:
 * nunca incluir dados pessoais, SQL, caminhos internos ou detalhes da infraestrutura.
 */
public abstract class ExcecaoAplicacao extends RuntimeException {

    private final CodigoErro codigo;

    protected ExcecaoAplicacao(CodigoErro codigo, String mensagem) {
        super(mensagem);
        this.codigo = codigo;
    }

    protected ExcecaoAplicacao(CodigoErro codigo, String mensagem, Throwable causa) {
        super(mensagem, causa);
        this.codigo = codigo;
    }

    public CodigoErro getCodigo() {
        return codigo;
    }
}
