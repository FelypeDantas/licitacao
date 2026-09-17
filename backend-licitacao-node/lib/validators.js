import { AppError } from "./errors.js";

/**
 * Valores aceitos pelo formulário original da CDHU.
 */
const MODALIDADES_PERMITIDAS = new Set([
    "",
    "Selecione a modalidade",
    "CR",
    "TP",
    "CV",
    "PP"
]);

const SITUACOES_PERMITIDAS = new Set([
    "",
    "avisoRadioButton",
    "andamentoRadioButton",
    "encerradaRadioButton"
]);

const ORDENACOES_PERMITIDAS = new Set([
    "",
    "crescenteRB",
    "decrescenteRB",
    "prioridadeRB"
]);

/**
 * Expressões regulares utilizadas na validação.
 */
const REGEX = {
    numero: /^[0-9]{1,4}[A-Za-z]?$/,
    ano: /^[0-9]{2,4}$/,
    data: /^(\d{2})\/(\d{2})\/(\d{4})$/
};

/**
 * Normaliza um valor recebido pela API.
 */
function normalize(value) {
    return String(value ?? "").trim();
}

/**
 * Converte o corpo recebido pela API em um objeto
 * de filtros padronizado.
 */
function normalizeFiltros(input) {
    return {
        modalidade: normalize(input.modalidade),
        numero: normalize(input.numero),
        ano: normalize(input.ano),
        municipio: normalize(input.municipio),
        segmento: normalize(input.segmento),
        data: normalize(input.data),
        situacao: normalize(input.situacao),
        ordenacao: normalize(input.ordenacao)
    };
}

/**
 * Valida modalidade.
 */
function validarModalidade(modalidade) {
    if (MODALIDADES_PERMITIDAS.has(modalidade)) {
        return;
    }

    throw new AppError(
        "Modalidade inválida.",
        400,
        "INVALID_MODALIDADE"
    );
}

/**
 * Valida situação.
 */
function validarSituacao(situacao) {
    if (SITUACOES_PERMITIDAS.has(situacao)) {
        return;
    }

    throw new AppError(
        "Situação inválida.",
        400,
        "INVALID_SITUACAO"
    );
}

/**
 * Valida ordenação.
 */
function validarOrdenacao(ordenacao) {
    if (ORDENACOES_PERMITIDAS.has(ordenacao)) {
        return;
    }

    throw new AppError(
        "Ordenação inválida.",
        400,
        "INVALID_ORDENACAO"
    );
}

/**
 * Valida número da licitação.
 *
 * Aceita:
 * 1
 * 12
 * 123
 * 1234
 * 123A
 * 1234A
 */
function validarNumero(numero) {
    if (!numero) {
        return;
    }

    if (REGEX.numero.test(numero)) {
        return;
    }

    throw new AppError(
        "O número deve conter até 4 dígitos e, opcionalmente, uma letra.",
        400,
        "INVALID_NUMERO"
    );
}

/**
 * Valida ano.
 *
 * Aceita 2 ou 4 dígitos.
 */
function validarAno(ano) {
    if (!ano) {
        return;
    }

    if (REGEX.ano.test(ano)) {
        return;
    }

    throw new AppError(
        "O ano deve conter 2 ou 4 dígitos.",
        400,
        "INVALID_ANO"
    );
}

/**
 * Valida uma data no formato dd/mm/aaaa.
 */
function validarData(data) {
    if (!data) {
        return;
    }

    const match = data.match(REGEX.data);

    if (!match) {
        throw new AppError(
            "A data deve estar no formato dd/mm/aaaa.",
            400,
            "INVALID_DATA"
        );
    }

    const [, dia, mes, ano] = match;

    const date = new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia)
    );

    /*
     * O JavaScript aceita automaticamente datas
     * inexistentes, por exemplo:
     *
     * 31/02/2026
     *
     * Por isso precisamos comparar novamente
     * os componentes da data.
     */
    const dataValida =
        date.getFullYear() === Number(ano) &&
        date.getMonth() === Number(mes) - 1 &&
        date.getDate() === Number(dia);

    if (!dataValida) {
        throw new AppError(
            "Data inválida.",
            400,
            "INVALID_DATA"
        );
    }
}

/**
 * Valida todos os filtros recebidos pela API.
 *
 * Retorna os filtros normalizados.
 */
export function validarFiltros(input = {}) {
    const filtros = normalizeFiltros(input);

    validarModalidade(filtros.modalidade);
    validarSituacao(filtros.situacao);
    validarOrdenacao(filtros.ordenacao);

    validarNumero(filtros.numero);
    validarAno(filtros.ano);
    validarData(filtros.data);

    return filtros;
}
