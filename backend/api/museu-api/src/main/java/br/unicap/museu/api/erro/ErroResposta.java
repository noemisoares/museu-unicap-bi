package br.unicap.museu.api.erro;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

/** Formato único de erro devolvido pela API. */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErroResposta(
        Instant timestamp,
        int status,
        String codigo,
        String mensagem,
        String caminho,
        List<CampoInvalido> campos) {

    public record CampoInvalido(String campo, String mensagem) {
    }

    public static ErroResposta de(int status, String codigo, String mensagem, String caminho) {
        return new ErroResposta(Instant.now(), status, codigo, mensagem, caminho, List.of());
    }

    public static ErroResposta comCampos(int status, String codigo, String mensagem,
                                         String caminho, List<CampoInvalido> campos) {
        return new ErroResposta(Instant.now(), status, codigo, mensagem, caminho, campos);
    }
}
