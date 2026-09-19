export default async function handler(req, res) {
    configurarCors(req, res);

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method === "GET") {
        return responderStatus(res);
    }

    if (req.method !== "POST") {
        return responderMetodoNaoPermitido(res);
    }

    try {
        const filtros = await processarRequisicao(req);

        const resultado = await executarBusca(filtros);

        return res.status(200).json({
            sucesso: true,
            ...resultado
        });

    } catch (error) {
        return tratarErro(res, error);
    }
}

/* ============================================================
   CORS
============================================================ */

function configurarCors(req, res) {
    const origemPermitida =
        process.env.FRONTEND_ORIGIN ||
        "https://felypedantas.github.io";

    const origem = req.headers.origin;

    if (origem === origemPermitida) {
        res.setHeader(
            "Access-Control-Allow-Origin",
            origemPermitida
        );
    }

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Accept"
    );

    res.setHeader(
        "Access-Control-Max-Age",
        "86400"
    );
}

/* ============================================================
   STATUS DA API
============================================================ */

function responderStatus(res) {
    return res.status(200).json({
        sucesso: true,
        servico: "API de Licitações",
        status: "online",
        metodoBusca: "POST",
        mensagem: "Utilize POST para realizar uma pesquisa."
    });
}

/* ============================================================
   MÉTODO NÃO PERMITIDO
============================================================ */

function responderMetodoNaoPermitido(res) {
    return res.status(405).json({
        sucesso: false,
        erro: "Método não permitido.",
        metodosPermitidos: [
            "GET",
            "POST",
            "OPTIONS"
        ]
    });
}

/* ============================================================
   PROCESSAMENTO DA REQUISIÇÃO
============================================================ */

async function processarRequisicao(req) {
    console.log("========================================");
    console.log("NOVA BUSCA DE LICITAÇÃO");
    console.log("========================================");

    console.log("ETAPA 1: API iniciou");
    console.log("Método:", req.method);
    console.log("URL:", req.url);

    const body = req.body || {};

    console.log("ETAPA 2: Body recebido");
    console.log(JSON.stringify(body, null, 2));

    console.log("ETAPA 3: Importando validators");

    const {
        validarFiltros
    } = await import("../lib/validators.js");

    console.log("ETAPA 4: Validators carregado");

    const filtros = validarFiltros(body);

    console.log("ETAPA 5: Filtros validados");
    console.log(JSON.stringify(filtros, null, 2));

    return filtros;
}

/* ============================================================
   BUSCA NO CDHU
============================================================ */

async function executarBusca(filtros) {
    console.log("ETAPA 6: Importando CDHU");

    const {
        buscarNoCdhu
    } = await import("../lib/cdhu.js");

    console.log("ETAPA 7: CDHU carregado");

    console.log("ETAPA 8: Consultando CDHU");

    console.log(
        "Filtros enviados ao CDHU:",
        JSON.stringify(filtros, null, 2)
    );

    const resultado = await buscarNoCdhu(filtros);

    console.log("ETAPA 9: CDHU respondeu");

    console.log(
        "Resultado:",
        JSON.stringify(resultado, null, 2)
    );

    return resultado;
}

/* ============================================================
   TRATAMENTO DE ERROS
============================================================ */

function tratarErro(res, error) {
    console.error("");
    console.error("========================================");
    console.error("ERRO NA API DE LICITAÇÕES");
    console.error("========================================");

    console.error("Nome:", error?.name);
    console.error("Mensagem:", error?.message);
    console.error("Código:", error?.code);
    console.error("Status:", error?.statusCode);
    console.error("Detalhes:", error?.details);
    console.error("Stack:", error?.stack);

    console.error("========================================");
    console.error("");

    const statusCode =
        Number.isInteger(error?.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode <= 599
            ? error.statusCode
            : 500;

    return res.status(statusCode).json({
        sucesso: false,
        erro:
            error?.message ||
            "Erro interno ao realizar a busca.",

        codigo:
            error?.code ||
            "INTERNAL_ERROR",

        detalhes:
            error?.details ||
            null
    });
}
