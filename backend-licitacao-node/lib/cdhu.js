import * as cheerio from "cheerio";
import { config } from "./config.js";
import { AppError } from "./errors.js";

/**
 * Cabeçalhos utilizados nas requisições para a CDHU.
 */
const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",

    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",

    "Cache-Control": "no-cache",

    Pragma: "no-cache"
};

/**
 * Normaliza textos vindos do HTML.
 */
function normalize(value) {
    return String(value ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Cria um AbortController com timeout.
 */
function createTimeoutController(timeoutMs) {
    const controller = new AbortController();

    const timer = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    return {
        controller,
        clear: () => clearTimeout(timer)
    };
}

/**
 * Extrai cookies Set-Cookie da resposta.
 */
function parseCookies(response) {
    const cookies = response.headers.getSetCookie?.() ?? [];

    return cookies
        .map((cookie) => cookie.split(";")[0])
        .filter(Boolean)
        .join("; ");
}

/**
 * Junta cookies antigos e novos.
 */
function mergeCookies(existingCookies, response) {
    const newCookies = parseCookies(response);

    if (!newCookies) {
        return existingCookies || "";
    }

    const cookieJar = new Map();

    const addCookies = (cookieString) => {
        for (const part of String(cookieString || "").split(";")) {
            const trimmed = part.trim();

            if (!trimmed) continue;

            const separatorIndex = trimmed.indexOf("=");

            if (separatorIndex === -1) continue;

            const name = trimmed.slice(0, separatorIndex).trim();
            const value = trimmed.slice(separatorIndex + 1).trim();

            if (name) {
                cookieJar.set(name, value);
            }
        }
    };

    addCookies(existingCookies);
    addCookies(newCookies);

    return [...cookieJar.entries()]
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
}

/**
 * Extrai os campos hidden do formulário ASP.NET.
 *
 * Esses campos são importantes porque o Web Forms
 * utiliza valores como __VIEWSTATE e __EVENTVALIDATION.
 */
function extractHiddenFields($) {
    const fields = {};

    $("form#form1 input[type='hidden']").each((_, element) => {
        const name = $(element).attr("name");

        if (!name) return;

        fields[name] = $(element).attr("value") ?? "";
    });

    return fields;
}

/**
 * Obtém o valor selecionado de um <select>.
 */
function getSelectedValue($, selector, fallback = "") {
    return (
        $(selector)
            .find("option:selected")
            .attr("value") ?? fallback
    );
}

/**
 * Monta os dados enviados para a CDHU.
 */
function buildSearchForm($, filtros) {
    const form = extractHiddenFields($);

    /*
     * Campos existentes no formulário original da CDHU.
     */
    form.modalidadeDropDownList =
        filtros.modalidade ||
        getSelectedValue($, "#modalidadeDropDownList");

    form.numTextBox = filtros.numero || "";

    form.anoTextBox = filtros.ano || "";

    form.municipioTextBox = filtros.municipio || "";

    form.segmentoDropDownList =
        filtros.segmento ||
        getSelectedValue($, "#segmentoDropDownList");

    form.dataTextBox = filtros.data || "";

    /*
     * Radio buttons.
     */
    if (filtros.situacao) {
        form.situacao = filtros.situacao;
    }

    if (filtros.ordenacao) {
        form.ordenacao = filtros.ordenacao;
    }

    /*
     * O botão original era:
     *
     * <input type="image" ...>
     *
     * Portanto o navegador enviava .x e .y.
     */
    form["buscarImageButton.x"] = "1";
    form["buscarImageButton.y"] = "1";

    return form;
}

/**
 * Converte objeto para application/x-www-form-urlencoded.
 */
function createFormBody(data) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) {
            continue;
        }

        params.append(key, String(value));
    }

    return params;
}

/**
 * Extrai texto de uma célula HTML.
 */
function getCellText($, cell) {
    return normalize($(cell).text());
}

/**
 * Normaliza o nome de uma coluna.
 *
 * Exemplo:
 * "Situação da Licitação"
 * ->
 * "situacao_da_licitacao"
 */
function cleanKey(value) {
    return normalize(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

/**
 * Converte o nome da coluna para o padrão utilizado
 * pelo frontend.
 */
function mapHeader(header) {
    const key = cleanKey(header);

    if (key.includes("numero")) {
        return "numero";
    }

    if (key.includes("modalidade")) {
        return "modalidade";
    }

    if (key.includes("municip")) {
        return "municipio";
    }

    if (key.includes("segmento")) {
        return "segmento";
    }

    if (key.includes("situacao")) {
        return "situacao";
    }

    if (
        key.includes("abertura") ||
        key.includes("data")
    ) {
        return "dataAbertura";
    }

    if (key.includes("objeto")) {
        return "objeto";
    }

    if (key.includes("edital")) {
        return "edital";
    }

    return key || "campo";
}

/**
 * Verifica se uma linha possui algum conteúdo.
 */
function hasContent(row) {
    return row.some((value) => Boolean(normalize(value)));
}

/**
 * Verifica se uma tabela parece ser uma tabela
 * de resultados de licitações.
 */
function isResultTable(headers) {
    return headers.some((header) =>
        /numero|modalidade|municip|situacao|abertura|objeto|edital/i.test(
            header
        )
    );
}

/**
 * Converte uma tabela HTML em objetos.
 */
function parseTable($, table) {
    const rows = $(table).find("tr");

    if (rows.length < 2) {
        return [];
    }

    const parsedRows = [];

    rows.each((_, row) => {
        const cells = $(row).find("th, td");

        if (!cells.length) {
            return;
        }

        const values = cells
            .map((__, cell) => getCellText($, cell))
            .get();

        parsedRows.push(values);
    });

    if (parsedRows.length < 2) {
        return [];
    }

    let headers = parsedRows[0];

    /*
     * Se a primeira linha não parece ser cabeçalho,
     * criamos nomes genéricos.
     */
    if (!isResultTable(headers)) {
        headers = headers.map(
            (_, index) => `campo_${index + 1}`
        );
    }

    const results = [];

    for (const row of parsedRows.slice(1)) {
        if (!hasContent(row)) {
            continue;
        }

        const item = {};

        headers.forEach((header, index) => {
            item[mapHeader(header)] = row[index] ?? "";
        });

        if (hasContent(Object.values(item))) {
            results.push(item);
        }
    }

    return results;
}

/**
 * Procura tabelas de resultados na página.
 */
function parseTables($) {
    const results = [];

    $("table").each((_, table) => {
        const parsed = parseTable($, table);

        if (parsed.length) {
            results.push(...parsed);
        }
    });

    return results;
}

/**
 * Extrai links existentes na área de licitações.
 */
function parseLinks($) {
    const links = [];

    $("#divLicitacao a").each((_, element) => {
        const href = $(element).attr("href") || null;
        const texto = normalize($(element).text());

        if (!href && !texto) {
            return;
        }

        links.push({
            texto,
            href
        });
    });

    return links;
}

/**
 * Procura uma mensagem apresentada pela CDHU.
 */
function extractMessage($) {
    const selectors = [
        "#msgLabel",
        ".style10",
        ".mensagem",
        "#divLicitacao"
    ];

    for (const selector of selectors) {
        const value = normalize(
            $(selector).first().text()
        );

        if (
            value &&
            /não foram encontradas|nenhuma|resultado|licit/i.test(
                value
            )
        ) {
            return value;
        }
    }

    return null;
}

/**
 * Encontra um link relacionado ao resultado.
 */
function findRelatedLink(links) {
    return (
        links.find((link) =>
            /edital|detalhe|licit/i.test(
                `${link.texto} ${link.href || ""}`
            )
        ) || null
    );
}

/**
 * Normaliza os resultados para o contrato esperado
 * pelo frontend.
 */
function normalizeResults(results, links) {
    const relatedLink = findRelatedLink(links);

    return results.map((result) => {
        const normalized = {
            ...result,

            numero: result.numero || "",
            modalidade: result.modalidade || "",
            municipio: result.municipio || "",
            segmento: result.segmento || "",
            situacao: result.situacao || "",
            dataAbertura: result.dataAbertura || "",
            objeto: result.objeto || "",
            edital: result.edital || ""
        };

        if (relatedLink?.href) {
            normalized.link = relatedLink.href;
        }

        return normalized;
    });
}

/**
 * Executa GET na página de busca da CDHU.
 */
async function loadCdhuPage(signal) {
    const response = await fetch(config.cdhuUrl, {
        method: "GET",
        headers: HEADERS,
        signal
    });

    if (!response.ok) {
        throw new AppError(
            `A CDHU respondeu ${response.status} ao abrir a página de busca.`,
            502,
            "CDHU_GET_FAILED"
        );
    }

    const cookies = parseCookies(response);
    const html = await response.text();

    return {
        html,
        cookies
    };
}

/**
 * Executa POST do formulário para a CDHU.
 */
async function submitCdhuSearch({
    form,
    cookies,
    signal
}) {
    const headers = {
        ...HEADERS,
        "Content-Type":
            "application/x-www-form-urlencoded",
        Referer: config.cdhuUrl
    };

    if (cookies) {
        headers.Cookie = cookies;
    }

    const response = await fetch(config.cdhuUrl, {
        method: "POST",
        headers,
        body: createFormBody(form),
        signal
    });

    if (!response.ok) {
        throw new AppError(
            `A CDHU respondeu ${response.status} na consulta.`,
            502,
            "CDHU_POST_FAILED"
        );
    }

    return {
        html: await response.text(),
        cookies: mergeCookies(cookies, response)
    };
}

/**
 * Processa o HTML retornado pela CDHU.
 */
function parseCdhuResponse(html) {
    const $ = cheerio.load(html);

    const resultadosBrutos = parseTables($);
    const links = parseLinks($);
    const resultados = normalizeResults(
        resultadosBrutos,
        links
    );

    const mensagem = extractMessage($);

    return {
        resultados,
        mensagem,
        quantidade: resultados.length
    };
}

/**
 * Pesquisa uma licitação diretamente na CDHU.
 *
 * Fluxo:
 *
 * 1. GET página original
 * 2. Captura cookies + hidden fields
 * 3. Monta formulário
 * 4. POST para CDHU
 * 5. Processa HTML retornado
 * 6. Retorna JSON
 */
export async function buscarNoCdhu(filtros) {
    const {
        controller,
        clear
    } = createTimeoutController(
        config.timeoutMs
    );

    try {
        /*
         * 1. Abre a página da CDHU.
         */
        const pagina = await loadCdhuPage(
            controller.signal
        );

        /*
         * 2. Analisa o HTML inicial.
         */
        const $ = cheerio.load(pagina.html);

        /*
         * 3. Monta o formulário utilizando
         * os campos originais do Web Forms.
         */
        const form = buildSearchForm(
            $,
            filtros
        );

        /*
         * 4. Envia a pesquisa.
         */
        const resposta = await submitCdhuSearch({
            form,
            cookies: pagina.cookies,
            signal: controller.signal
        });

        /*
         * 5. Debug opcional.
         */
        if (config.debugHtml) {
            console.log(
                "Resposta CDHU:",
                resposta.html.slice(0, 2000)
            );
        }

        /*
         * 6. Processa os resultados.
         */
        const dados = parseCdhuResponse(
            resposta.html
        );

        /*
         * 7. Retorna resposta padronizada.
         */
        return {
            ...dados,
            fonte: config.cdhuUrl
        };

    } catch (error) {
        /*
         * Timeout.
         */
        if (error?.name === "AbortError") {
            throw new AppError(
                "A consulta à CDHU excedeu o tempo limite.",
                504,
                "CDHU_TIMEOUT"
            );
        }

        /*
         * Erros controlados da aplicação.
         */
        if (error instanceof AppError) {
            throw error;
        }

        /*
         * Erros inesperados.
         */
        throw new AppError(
            "Não foi possível consultar a CDHU.",
            502,
            "CDHU_UNAVAILABLE",
            error?.message || "Erro desconhecido."
        );

    } finally {
        clear();
    }
}
