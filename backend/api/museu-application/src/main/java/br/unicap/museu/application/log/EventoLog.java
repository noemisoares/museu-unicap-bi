package br.unicap.museu.application.log;

import java.time.Instant;
import java.util.Objects;

/**
 * Evento a ser registrado. A mensagem passa sempre pelo mascaramento no construtor,
 * então não há como criar um evento com e-mail, telefone ou senha em texto puro.
 */
public record EventoLog(TipoEvento tipo, String mensagem, Instant ocorridoEm) {

    public EventoLog {
        Objects.requireNonNull(tipo, "tipo é obrigatório");
        mensagem = MascaramentoDadosSensiveis.mascarar(mensagem);
        ocorridoEm = (ocorridoEm == null) ? Instant.now() : ocorridoEm;
    }

    public static EventoLog de(TipoEvento tipo, String mensagem) {
        return new EventoLog(tipo, mensagem, Instant.now());
    }
}
