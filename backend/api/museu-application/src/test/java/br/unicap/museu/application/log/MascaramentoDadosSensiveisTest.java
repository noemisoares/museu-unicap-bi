package br.unicap.museu.application.log;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class MascaramentoDadosSensiveisTest {

    @Test
    void mascaraEmail() {
        assertEquals("Falha ao notificar [email]",
                MascaramentoDadosSensiveis.mascarar("Falha ao notificar maria@exemplo.com"));
    }

    @Test
    void mascaraTelefoneComFormatacao() {
        assertEquals("Contato [dado-sensivel] inválido",
                MascaramentoDadosSensiveis.mascarar("Contato (81) 98888-7777 inválido"));
    }

    @Test
    void mascaraCpf() {
        assertEquals("Documento [dado-sensivel] rejeitado",
                MascaramentoDadosSensiveis.mascarar("Documento 123.456.789-09 rejeitado"));
    }

    @Test
    void mascaraSenhaETokenIndependenteDeMaiusculas() {
        assertEquals("login com Senha=[oculto] falhou",
                MascaramentoDadosSensiveis.mascarar("login com Senha=abc123 falhou"));
        assertEquals("token=[oculto]",
                MascaramentoDadosSensiveis.mascarar("token: eyJhbGciOi"));
    }

    @Test
    void naoAlteraTextoSemDadosSensiveis() {
        assertEquals("Totem 3 não encontrado",
                MascaramentoDadosSensiveis.mascarar("Totem 3 não encontrado"));
        assertEquals("Falha ao consultar view app_admin",
                MascaramentoDadosSensiveis.mascarar("Falha ao consultar view app_admin"));
    }

    @Test
    void textoNuloViraVazio() {
        assertEquals("", MascaramentoDadosSensiveis.mascarar(null));
    }
}
