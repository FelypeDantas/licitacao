import * as cheerio from "cheerio";
import { config } from "./config.js";
import { AppError } from "./errors.js";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache"
};

function normalize(value) {
  return String(value ?? "")
    .replace(/\\u00a0/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function parseCookies(response) {
  const setCookie = response.headers.getSetCookie?.() || [];
  return setCookie
    .map((item) => item.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

function appendCookie(existing, response) {
  const newCookies = parseCookies(response);
  if (!newCookies) return existing;

  const jar = new Map();

  for (const part of String(existing || "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name && rest.length) jar.set(name, rest.join("="));
  }

  for (const part of newCookies.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name && rest.length) jar.set(name, rest.join("="));
  }

  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function hiddenFields($) {
  const data = {};

  $('form#form1 input[type="hidden"]').each((_, el) => {
    const name = $(el).attr("name");
    if (!name) return;
    data[name] = $(el).attr("value") ?? "";
  });

  return data;
}

function selectedValue($, selector, fallback = "") {
  return $(selector).find("option:selected").attr("value") ?? fallback;
}

function selectedText($, selector, fallback = "") {
  return normalize($(selector).find("option:selected").text()) || fallback;
}

function buildForm($, filtros) {
  const data = hiddenFields($);

  // Campos do formulário original da CDHU.
  data.modalidadeDropDownList =
    filtros.modalidade || selectedValue($, "#modalidadeDropDownList", "");
  data.numTextBox = filtros.numero || "";
  data.anoTextBox = filtros.ano || "";
  data.municipioTextBox = filtros.municipio || "";
  data.segmentoDropDownList =
    filtros.segmento || selectedValue($, "#segmentoDropDownList", "");
  data.dataTextBox = filtros.data || "";

  // O HTML original usa radio buttons com name="situacao".
  if (filtros.situacao) {
    data.situacao = filtros.situacao;
  }

  // O HTML original usa radio buttons com name="ordenacao".
  if (filtros.ordenacao) {
    data.ordenacao = filtros.ordenacao;
  }

  // Simula o clique do input type="image" original.
  data["buscarImageButton.x"] = "1";
  data["buscarImageButton.y"] = "1";

  return data;
}

function toUrlSearchParams(data) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }

  return params;
}

function textOfCell($, cell) {
  return normalize($(cell).text());
}

function cleanKey(key) {
  return normalize(key)
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function mapHeader(header) {
  const key = cleanKey(header);

  if (key.includes("numero")) return "numero";
  if (key.includes("modalidade")) return "modalidade";
  if (key.includes("municip")) return "municipio";
  if (key.includes("segmento")) return "segmento";
  if (key.includes("situacao") || key.includes("situacao")) return "situacao";
  if (key.includes("abertura") || key.includes("data")) return "dataAbertura";
  if (key.includes("objeto")) return "objeto";
  if (key.includes("edital")) return "edital";

  return key || "campo";
}

function parseTables($) {
  const resultados = [];

  $("table").each((_, table) => {
    const rows = $(table).find("tr");
    if (rows.length < 2) return;

    const parsedRows = [];
    rows.each((__, row) => {
      const cells = $(row).find("th,td");
      if (!cells.length) return;
      parsedRows.push(cells.map((___, cell) => textOfCell($, cell)).get());
    });

    if (parsedRows.length < 2) return;

    let headers = parsedRows[0];
    let start = 1;

    const headerLooksUseful = headers.some((h) =>
      /numero|modalidade|municip|situacao|abertura|objeto|edital/i.test(h)
    );

    if (!headerLooksUseful) {
      headers = parsedRows[0].map((_, index) => `campo_${index + 1}`);
    }

    for (const row of parsedRows.slice(start)) {
      if (row.every((value) => !value)) continue;

      const item = {};
      headers.forEach((header, index) => {
        const value = row[index] ?? "";
        item[mapHeader(header)] = value;
      });

      const meaningful = Object.values(item).some(Boolean);
      if (meaningful) resultados.push(item);
    }
  });

  return resultados;
}

function parseLinks($) {
  const links = [];

  $("#divLicitacao a").each((_, el) => {
    const href = $(el).attr("href");
    const text = normalize($(el).text());

    if (!href && !text) return;

    links.push({
      texto: text,
      href: href || null
    });
  });

  return links;
}

function extractMessage($) {
  const selectors = [
    "#msgLabel",
    ".style10",
    ".mensagem",
    "#divLicitacao"
  ];

  for (const selector of selectors) {
    const value = normalize($(selector).first().text());
    if (value && /não foram encontradas|nenhuma|resultado|licit/i.test(value)) {
      return value;
    }
  }

  return null;
}

function normalizeResults(results, links) {
  return results.map((item) => {
    const normalized = { ...item };

    // Compatibilidade com o formato esperado pelo frontend.
    normalized.numero = normalized.numero || "";
    normalized.modalidade = normalized.modalidade || "";
    normalized.municipio = normalized.municipio || "";
    normalized.situacao = normalized.situacao || "";
    normalized.dataAbertura = normalized.dataAbertura || "";

    const related = links.find((link) =>
      /edital|detalhe|licit/i.test(`${link.texto} ${link.href || ""}`)
    );

    if (related) normalized.link = related.href;

    return normalized;
  });
}

export async function buscarNoCdhu(filtros) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const primeira = await fetch(config.cdhuUrl, {
      method: "GET",
      headers: HEADERS,
      signal: controller.signal
    });

    if (!primeira.ok) {
      throw new AppError(
        `A CDHU respondeu ${primeira.status} ao abrir a página de busca.`,
        502,
        "CDHU_GET_FAILED"
      );
    }

    let cookies = parseCookies(primeira);
    const htmlInicial = await primeira.text();
    const $ = cheerio.load(htmlInicial);

    const form = buildForm($, filtros);

    const segunda = await fetch(config.cdhuUrl, {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: config.cdhuUrl,
        ...(cookies ? { Cookie: cookies } : {})
      },
      body: toUrlSearchParams(form),
      signal: controller.signal
    });

    cookies = appendCookie(cookies, segunda);

    if (!segunda.ok) {
      throw new AppError(
        `A CDHU respondeu ${segunda.status} na consulta.`,
        502,
        "CDHU_POST_FAILED"
      );
    }

    const htmlResultado = await segunda.text();

    if (config.debugHtml) {
      console.log("Resposta CDHU:", htmlResultado.slice(0, 2000));
    }

    const $resultado = cheerio.load(htmlResultado);
    const resultadosBrutos = parseTables($resultado);
    const links = parseLinks($resultado);
    const resultados = normalizeResults(resultadosBrutos, links);
    const mensagem = extractMessage($resultado);

    return {
      resultados,
      mensagem,
      quantidade: resultados.length,
      fonte: config.cdhuUrl
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new AppError(
        "A consulta à CDHU excedeu o tempo limite.",
        504,
        "CDHU_TIMEOUT"
      );
    }

    if (error instanceof AppError) throw error;

    throw new AppError(
      "Não foi possível consultar a CDHU.",
      502,
      "CDHU_UNAVAILABLE",
      error.message
    );
  } finally {
    clearTimeout(timer);
  }
}
