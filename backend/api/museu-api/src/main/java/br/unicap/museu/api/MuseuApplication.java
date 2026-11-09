package br.unicap.museu.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Ponto de entrada. Fica na camada API (raiz de composição) e varre todos os pacotes
 * br.unicap.museu.*, incluindo os adaptadores da camada Infrastructure.
 */
@SpringBootApplication(scanBasePackages = "br.unicap.museu")
public class MuseuApplication {

    public static void main(String[] args) {
        SpringApplication.run(MuseuApplication.class, args);
    }
}
