package br.unicap.museu.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Libera o acesso do navegador às rotas da API para as origens dos front-ends (totem e painel).
 * As origens vêm da variável de ambiente CORS_ALLOWED_ORIGINS (lista separada por vírgula),
 * então cada ambiente configura as suas sem alterar o código.
 *
 * <p>Sem cookies: a autenticação do painel usa o cabeçalho Authorization, por isso
 * não há allowCredentials.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] origensPermitidas;

    public CorsConfig(@Value("${app.cors.allowed-origins}") String[] origensPermitidas) {
        this.origensPermitidas = origensPermitidas;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origensPermitidas)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type")
                .exposedHeaders("Content-Disposition")
                .maxAge(3600);
    }
}
