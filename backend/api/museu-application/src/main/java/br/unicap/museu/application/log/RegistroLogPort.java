package br.unicap.museu.application.log;

/**
 * Porta de saída do "Registrar log" do fluxo. A Application só conhece esta interface;
 * quem decide onde o log vai parar (arquivo, tabela no PostgreSQL) é a Infrastructure.
 *
 * <p>Implementações não podem lançar exceção: falhar ao registrar um log não pode derrubar
 * a operação que está sendo registrada.
 */
public interface RegistroLogPort {

    void registrar(EventoLog evento);
}
