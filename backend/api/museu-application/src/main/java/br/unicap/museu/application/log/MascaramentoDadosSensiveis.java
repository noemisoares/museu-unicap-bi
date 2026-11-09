package br.unicap.museu.application.log;

import java.util.regex.Pattern;

/**
 * Remove de um texto o que não pode ir para log (RF27): e-mails, sequências numéricas longas
 * (telefone/WhatsApp, CPF, documentos) e valores de senha/token.
 *
 * <p>É conservador de propósito: prefere mascarar demais a vazar um dado pessoal.
 * Exemplo de efeito colateral: datas como 2026-11-08 também são mascaradas; a data do evento
 * já vai no campo próprio {@code ocorridoEm}.
 */
public final class MascaramentoDadosSensiveis {

    private static final Pattern SEGREDO =
            Pattern.compile("(?i)\\b(senha|password|token|secret)\\s*[=:]\\s*\\S+");
    private static final Pattern EMAIL =
            Pattern.compile("[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+");
    private static final Pattern NUMERO_LONGO =
            Pattern.compile("(?<!\\w)\\(?\\+?\\d[\\d\\s().-]{7,}\\d\\)?(?!\\w)");

    private MascaramentoDadosSensiveis() {
    }

    public static String mascarar(String texto) {
        if (texto == null) {
            return "";
        }
        String resultado = SEGREDO.matcher(texto).replaceAll("$1=[oculto]");
        resultado = EMAIL.matcher(resultado).replaceAll("[email]");
        resultado = NUMERO_LONGO.matcher(resultado).replaceAll("[dado-sensivel]");
        return resultado;
    }
}
