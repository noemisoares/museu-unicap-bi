package br.unicap.museu.api.erro;

import br.unicap.museu.application.erro.ConflitoException;
import br.unicap.museu.application.erro.FalhaIntegracaoException;
import br.unicap.museu.application.erro.RecursoNaoEncontradoException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Existe só nos testes: provoca cada tipo de erro para validar o GlobalExceptionHandler. */
@RestController
@RequestMapping("/teste-erros")
public class ControllerDeTesteErros {

    @GetMapping("/nao-encontrado")
    public void naoEncontrado() {
        throw new RecursoNaoEncontradoException("Totem não encontrado.");
    }

    @GetMapping("/conflito")
    public void conflito() {
        throw new ConflitoException("Totem já registrado.");
    }

    @GetMapping("/falha-integracao")
    public void falhaIntegracao() {
        throw new FalhaIntegracaoException("Não foi possível consultar os dados.",
                new IllegalStateException("conexão recusada em jdbc:postgresql://host-interno"));
    }

    @GetMapping("/inesperado")
    public void inesperado() {
        throw new IllegalStateException("senha=abc123 contato maria@exemplo.com");
    }
}
