import { AppError } from "./errors.js";

const allowedModalidades = new Set([
  "",
  "Selecione a modalidade",
  "CR",
  "TP",
  "CV",
  "PP"
]);

const allowedSituacoes = new Set([
  "",
  "avisoRadioButton",
  "andamentoRadioButton",
  "encerradaRadioButton"
]);

const allowedOrdenacoes = new Set([
  "",
  "crescenteRB",
  "decrescenteRB",
  "prioridadeRB"
]);

export function validarFiltros(input = {}) {
  const filtros = {
    modalidade: String(input.modalidade ?? "").trim(),
    numero: String(input.numero ?? "").trim(),
    ano: String(input.ano ?? "").trim(),
    municipio: String(input.municipio ?? "").trim(),
    segmento: String(input.segmento ?? "").trim(),
    data: String(input.data ?? "").trim(),
    situacao: String(input.situacao ?? "").trim(),
    ordenacao: String(input.ordenacao ?? "").trim()
  };

  if (!allowedModalidades.has(filtros.modalidade)) {
    throw new AppError("Modalidade inválida.", 400, "INVALID_MODALIDADE");
  }

  if (!allowedSituacoes.has(filtros.situacao)) {
    throw new AppError("Situação inválida.", 400, "INVALID_SITUACAO");
  }

  if (!allowedOrdenacoes.has(filtros.ordenacao)) {
    throw new AppError("Ordenação inválida.", 400, "INVALID_ORDENACAO");
  }

  if (filtros.numero && !/^[0-9]{1,4}[A-Za-z]?$/.test(filtros.numero)) {
    throw new AppError(
      "O número deve conter até 4 dígitos e, opcionalmente, uma letra.",
      400,
      "INVALID_NUMERO"
    );
  }

  if (filtros.ano && !/^[0-9]{2,4}$/.test(filtros.ano)) {
    throw new AppError(
      "O ano deve conter 2 ou 4 dígitos.",
      400,
      "INVALID_ANO"
    );
  }

  if (filtros.data) {
    const match = filtros.data.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/);

    if (!match) {
      throw new AppError(
        "A data deve estar no formato dd/mm/aaaa.",
        400,
        "INVALID_DATA"
      );
    }

    const [, dd, mm, yyyy] = match;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

    if (
      date.getFullYear() !== Number(yyyy) ||
      date.getMonth() !== Number(mm) - 1 ||
      date.getDate() !== Number(dd)
    ) {
      throw new AppError("Data inválida.", 400, "INVALID_DATA");
    }
  }

  return filtros;
}
