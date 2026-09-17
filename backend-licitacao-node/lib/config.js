import "dotenv/config";

/**
 * Converte uma variável de ambiente para número.
 * Usa o valor padrão quando estiver ausente ou inválido.
 */
function envNumber(name, fallback) {
    const value = Number(process.env[name]);

    return Number.isFinite(value) && value > 0
        ? value
        : fallback;
}

/**
 * Converte uma variável de ambiente para boolean.
 */
function envBoolean(name, fallback = false) {
    const value = process.env[name];

    if (value === undefined) {
        return fallback;
    }

    return String(value).trim().toLowerCase() === "true";
}

/**
 * Configurações da aplicação.
 */
export const config = {
    /**
     * Porta utilizada localmente.
     *
     * No Vercel, a plataforma gerencia a porta.
     */
    port: envNumber("PORT", 3000),

    /**
     * Origem autorizada do frontend.
     */
    frontendOrigin:
        process.env.FRONTEND_ORIGIN ||
        "https://felypedantas.github.io",

    /**
     * Página de busca da CDHU.
     */
    cdhuUrl:
        process.env.CDHU_URL ||
        "https://app.cdhu.sp.gov.br/Licitacoes/busca_internet.aspx",

    /**
     * Tempo máximo da consulta à CDHU.
     */
    timeoutMs: envNumber(
        "REQUEST_TIMEOUT_MS",
        20000
    ),

    /**
     * Exibe parte do HTML retornado pela CDHU
     * nos logs quando ativado.
     */
    debugHtml: envBoolean(
        "DEBUG_HTML",
        false
    )
};
