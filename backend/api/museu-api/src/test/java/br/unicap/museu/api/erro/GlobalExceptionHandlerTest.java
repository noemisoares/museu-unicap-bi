package br.unicap.museu.api.erro;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void recursoNaoEncontradoVira404() throws Exception {
        mockMvc.perform(get("/teste-erros/nao-encontrado"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NAO_ENCONTRADO"))
                .andExpect(jsonPath("$.mensagem").value("Totem não encontrado."))
                .andExpect(jsonPath("$.caminho").value("/teste-erros/nao-encontrado"));
    }

    @Test
    void conflitoVira409() throws Exception {
        mockMvc.perform(get("/teste-erros/conflito"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("CONFLITO"));
    }

    @Test
    void falhaDeIntegracaoVira503SemExporACausa() throws Exception {
        mockMvc.perform(get("/teste-erros/falha-integracao"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.codigo").value("FALHA_INTEGRACAO"))
                .andExpect(content().string(not(containsString("jdbc"))))
                .andExpect(content().string(not(containsString("host-interno"))));
    }

    @Test
    void erroInesperadoVira500GenericoSemVazarDados() throws Exception {
        mockMvc.perform(get("/teste-erros/inesperado"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.codigo").value("ERRO_INTERNO"))
                .andExpect(content().string(not(containsString("maria@exemplo.com"))))
                .andExpect(content().string(not(containsString("abc123"))));
    }

    @Test
    void rotaInexistenteVira404Padronizado() throws Exception {
        mockMvc.perform(get("/api/v1/nao-existe"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NAO_ENCONTRADO"))
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void metodoNaoPermitidoVira405Padronizado() throws Exception {
        mockMvc.perform(post("/api/v1/health"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));
    }
}
