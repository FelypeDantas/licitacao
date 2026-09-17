import { buscarNoCdhu } from "../lib/cdhu.js";
import { validarFiltros } from "../lib/validators.js";

export default async function handler(req, res) {
    // =========================================================
    // CORS
    // =========================================================

    const allowedOrigin =
        process.env.FRONTEND_ORIGIN || "http://localhost:3000";

    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // =========================================================
    // Preflight do navegador
    // =========================================================

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    // =========================================================
    // Apenas POST
    // =========================================================

    if (req.method !== "POST") {
        return res.status(405).json({
            sucesso: false,
            erro: "Método não permitido. Utilize POST."
        });
    }

    try {
        // =====================================================
        // Corpo da requisição
        // =====================================================

        const filtros = req.body || {};

        // =====================================================
        // Validação
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
        // Pesquisa na CDHU
        // =====================================================

        const resultado = await buscarNoCdhu(filtros);

        // =====================================================
        // Resposta
        // =====================================================

        return res.status(200).json({
            sucesso: true,
            ...resultado
        });

    } catch (error) {
        console.error("Erro na API de licitações:", error);

        return res.status(500).json({
            sucesso: false,
            erro: "Não foi possível realizar a pesquisa.",
            detalhes:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });
    }
}