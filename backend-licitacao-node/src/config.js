import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "https://felypedantas.github.io",
  cdhuUrl:
    process.env.CDHU_URL ||
    "https://app.cdhu.sp.gov.br/Licitacoes/busca_internet.aspx",
  timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 20000),
  debugHtml: String(process.env.DEBUG_HTML || "false").toLowerCase() === "true"
};
