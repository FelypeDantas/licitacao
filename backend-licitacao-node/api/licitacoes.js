export default async function handler(req, res) {

    const origin = req.headers.origin;

    const allowedOrigin =
        process.env.FRONTEND_ORIGIN ||
        "https://felypedantas.github.io";

    // =========================================================
    // CORS
    // =========================================================

    if (origin === allowedOrigin) {
        res.setHeader(
            "Access-Control-Allow-Origin",
            allowedOrigin
        );
    }

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Accept"
    );

    res.setHeader(
        "Access-Control-Max-Age",
        "86400"
    );

    // =========================================================
    // PRE-FLIGHT
    // =========================================================

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    // =========================================================
    // MÉTODO
    // =========================================================

    if (req.method !== "POST") {
        return res.status(405).json({
            sucesso: false,
            erro: "Método não permitido. Utilize POST."
        });
    }

    try {

        // =====================================================
        // IMPORTAÇÕES
        // =====================================================

        const { buscarNoCdhu } =
            await import("../lib/cdhu.js");

        const { validarFiltros } =
            await import("../lib/validators.js");

        // =====================================================
        // DADOS RECEBIDOS
        // =====================================================

        const filtros = req.body || {};

        // =====================================================
        // VALIDAÇÃO
        // =====================================================

        const validacao = validarFiltros(filtros);

        if (!validacao.valido) {
            return res.status(400).json({
                sucesso: false,
                erro: "Dados inválidos.",
                detalhes: validacao.erros
            });
        }

        // =====================================================
        // BUSCA NA CDHU
        // =====================================================

        const resultado =
            await buscarNoCdhu(filtros);

        // =====================================================
        // RESPOSTA
        // =====================================================

        return res.status(200).json({
            sucesso: true,
            ...resultado
        });

    } catch (error) {

        console.error(
            "Erro na API de licitações:",
            error
        );

        return res.status(500).json({
            sucesso: false,
            erro: "Não foi possível realizar a pesquisa.",
            detalhes: error.message
        });
    }
}
