package br.unicap.museu.api.erro;

import br.unicap.museu.application.erro.CodigoErro;
import br.unicap.museu.application.erro.ExcecaoAplicacao;
import br.unicap.museu.application.log.EventoLog;
import br.unicap.museu.application.log.RegistroLogPort;
import br.unicap.museu.application.log.TipoEvento;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Traduz qualquer exceção em {@link ErroResposta}. Regras:
 * <ul>
 *   <li>exceções da Application viram o status HTTP correspondente, com a mensagem escrita por quem lançou;</li>
 *   <li>erros de validação informam o campo e a regra, nunca o valor enviado;</li>
 *   <li>qualquer outra exceção vira 500 com mensagem genérica; detalhes ficam só no log, mascarados (RF27).</li>
 * </ul>
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final RegistroLogPort registroLog;

    public GlobalExceptionHandler(RegistroLogPort registroLog) {
        this.registroLog = registroLog;
    }

    @ExceptionHandler(ExcecaoAplicacao.class)
    public ResponseEntity<ErroResposta> tratarExcecaoAplicacao(ExcecaoAplicacao ex, HttpServletRequest request) {
        if (ex.getCodigo() == CodigoErro.FALHA_INTEGRACAO) {
            registroLog.registrar(EventoLog.de(TipoEvento.FALHA_INTEGRACAO, ex.getMessage()));
            LOG.debug("Falha de integração", ex);
        }
        HttpStatus status = statusDe(ex.getCodigo());
        return ResponseEntity.status(status)
                .body(ErroResposta.de(status.value(), ex.getCodigo().name(), ex.getMessage(),
                        request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErroResposta> tratarInesperada(Exception ex, HttpServletRequest request) {
        // Só o nome da classe vai para o log de eventos: a mensagem da exceção pode conter dado pessoal.
        registroLog.registrar(EventoLog.de(TipoEvento.ERRO_INTERNO, ex.getClass().getSimpleName()));
        LOG.debug("Erro interno não tratado", ex);
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(status)
                .body(ErroResposta.de(status.value(), CodigoErro.ERRO_INTERNO.name(),
                        "Erro interno. Tente novamente mais tarde.", request.getRequestURI()));
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<ErroResposta.CampoInvalido> campos = ex.getBindingResult().getFieldErrors().stream()
                .map(erro -> new ErroResposta.CampoInvalido(erro.getField(), erro.getDefaultMessage()))
                .toList();
        ErroResposta corpo = ErroResposta.comCampos(status.value(), CodigoErro.DADO_INVALIDO.name(),
                "Há campos inválidos na requisição.", caminho(request), campos);
        return ResponseEntity.status(status).headers(headers).body(corpo);
    }

    /** Todas as demais exceções do Spring MVC (rota inexistente, método errado, JSON ilegível...). */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        int status = statusCode.value();
        String codigo;
        if (status == HttpStatus.NOT_FOUND.value()) {
            codigo = CodigoErro.RECURSO_NAO_ENCONTRADO.name();
        } else if (status >= 500) {
            codigo = CodigoErro.ERRO_INTERNO.name();
        } else {
            codigo = "REQUISICAO_INVALIDA";
        }
        ErroResposta corpo = ErroResposta.de(status, codigo, mensagemPadrao(status), caminho(request));
        return ResponseEntity.status(statusCode).headers(headers).body(corpo);
    }

    private static HttpStatus statusDe(CodigoErro codigo) {
        return switch (codigo) {
            case DADO_INVALIDO -> HttpStatus.BAD_REQUEST;
            case RECURSO_NAO_ENCONTRADO -> HttpStatus.NOT_FOUND;
            case CONFLITO -> HttpStatus.CONFLICT;
            case ACESSO_NEGADO -> HttpStatus.FORBIDDEN;
            case FALHA_INTEGRACAO -> HttpStatus.SERVICE_UNAVAILABLE;
            case ERRO_INTERNO -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    private static String mensagemPadrao(int status) {
        return switch (status) {
            case 400 -> "Requisição inválida.";
            case 404 -> "Recurso não encontrado.";
            case 405 -> "Método HTTP não permitido para este recurso.";
            case 415 -> "Tipo de conteúdo não suportado.";
            default -> status >= 500
                    ? "Erro interno. Tente novamente mais tarde."
                    : "Não foi possível processar a requisição.";
        };
    }

    private static String caminho(WebRequest request) {
        return (request instanceof ServletWebRequest servlet) ? servlet.getRequest().getRequestURI() : null;
    }
}
