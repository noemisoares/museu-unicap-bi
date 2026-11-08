package br.unicap.museu.application.log;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class EventoLogTest {

    @Test
    void mensagemEhMascaradaNaCriacao() {
        EventoLog evento = EventoLog.de(TipoEvento.FALHA_VIEW, "erro para maria@exemplo.com");

        assertFalse(evento.mensagem().contains("maria@exemplo.com"));
        assertEquals("erro para [email]", evento.mensagem());
        assertNotNull(evento.ocorridoEm());
    }

    @Test
    void tipoEhObrigatorio() {
        assertThrows(NullPointerException.class, () -> EventoLog.de(null, "x"));
    }
}
