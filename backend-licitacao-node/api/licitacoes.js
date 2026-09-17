export default async function handler(req, res) {
    res.setHeader(
        "Access-Control-Allow-Origin",
        process.env.FRONTEND_ORIGIN ||
            "https://felypedantas.github.io"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Accept"
    );

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            sucesso: false,
            erro: "Método não permitido."
        });
    }

    try {
        console.log("ETAPA 1: API iniciou");

        const body = req.body || {};

        console.log("ETAPA 2: Body recebido");
        console.log(JSON.stringify(body));

        console.log("ETAPA 3: Importando validators");

        const validators =
            await import("../lib/validators.js");

        console.log("ETAPA 4: Validators carregado");

        const { validarFiltros } = validators;

        const filtros = validarFiltros(body);

        console.log("ETAPA 5: Filtros validados");
        console.log(JSON.stringify(filtros));

        console.log("ETAPA 6: Importando CDHU");

        const cdhu =
            await import("../lib/cdhu.js");

        console.log("ETAPA 7: CDHU carregado");

        const { buscarNoCdhu } = cdhu;

        console.log("ETAPA 8: Consultando CDHU");

        const resultado =
            await buscarNoCdhu(filtros);

        console.log("ETAPA 9: CDHU respondeu");

        return res.status(200).json({
            sucesso: true,
            ...resultado
        });

    } catch (error) {
        console.error("========== ERRO ==========");
        console.error("Nome:", error?.name);
        console.error("Mensagem:", error?.message);
        console.error("Código:", error?.code);
        console.error("Stack:", error?.stack);
        console.error("==========================");

        return res.status(
            error?.statusCode || 500
        ).json({
            sucesso: false,
            erro: error?.message ||
                "Erro interno.",
            codigo: error?.code ||
                "INTERNAL_ERROR",
            detalhes: error?.details || null
        });
    }
}
