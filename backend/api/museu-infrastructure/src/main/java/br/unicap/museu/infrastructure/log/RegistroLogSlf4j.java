package br.unicap.museu.infrastructure.log;

import br.unicap.museu.application.log.EventoLog;
import br.unicap.museu.application.log.RegistroLogPort;
import br.unicap.museu.application.log.TipoEvento;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Adaptador provisório: grava os eventos no log da aplicação (SLF4J).
 *
 * <p>Quando a modelagem do banco (task 11) definir a tabela de log, entra um adaptador que
 * persiste no PostgreSQL implementando a mesma porta; nenhum caso de uso muda.
 */
@Component
public class RegistroLogSlf4j implements RegistroLogPort {

    private static final Logger LOG = LoggerFactory.getLogger("br.unicap.museu.eventos");

    @Override
    public void registrar(EventoLog evento) {
        try {
            if (evento.tipo() == TipoEvento.ACESSO_CONTATO) {
                LOG.info("[{}] {}", evento.tipo(), evento.mensagem());
            } else {
                LOG.warn("[{}] {}", evento.tipo(), evento.mensagem());
            }
        } catch (RuntimeException ignorada) {
            // Falhar ao registrar log não pode derrubar a operação principal.
        }
    }
}
