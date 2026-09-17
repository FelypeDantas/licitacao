'use strict';

/**
 * Busca de Licitação - CDHU
 *
 * Responsabilidades:
 * - Inicializar os comportamentos da página
 * - Validar campos antes do envio
 * - Aplicar máscara à data
 * - Controlar mensagens de validação
 * - Atualizar a altura quando a página estiver dentro de iframe
 *
 * Observação:
 * O postback continua sendo realizado pelo ASP.NET Web Forms.
 * Este arquivo não substitui os controles gerados pelo servidor.
 */

(() => {

    /* =========================================================
       CONFIGURAÇÕES
    ========================================================= */

    const CONFIG = {
        seletores: {
            formulario: '#form1',
            modalidade: '#modalidadeDropDownList',
            numero: '#numTextBox',
            ano: '#anoTextBox',
            municipio: '#municipioTextBox',
            segmento: '#segmentoDropDownList',
            data: '#dataTextBox',

            aviso: '#avisoRadioButton',
            andamento: '#andamentoRadioButton',
            encerrada: '#encerradaRadioButton',

            crescente: '#crescenteRB',
            decrescente: '#decrescenteRB',
            prioridade: '#prioridadeRB',

            mensagem: '#msgLabel',
            botaoBuscar: '#buscarImageButton',
            container: '#divLicitacao'
        },

        data: {
            tamanho: 10,
            mascara: 'dd/mm/aaaa'
        },

        iframe: {
            margem: 40
        }
    };


    /* =========================================================
       UTILITÁRIOS
    ========================================================= */

    const $ = (selector) => document.querySelector(selector);

    const elementoExiste = (elemento) => elemento !== null;

    const obterElemento = (selector) => $(selector);


    /* =========================================================
       REFERÊNCIAS DOS ELEMENTOS
    ========================================================= */

    const elementos = {
        formulario: obterElemento(CONFIG.seletores.formulario),

        modalidade: obterElemento(CONFIG.seletores.modalidade),
        numero: obterElemento(CONFIG.seletores.numero),
        ano: obterElemento(CONFIG.seletores.ano),
        municipio: obterElemento(CONFIG.seletores.municipio),
        segmento: obterElemento(CONFIG.seletores.segmento),
        data: obterElemento(CONFIG.seletores.data),

        aviso: obterElemento(CONFIG.seletores.aviso),
        andamento: obterElemento(CONFIG.seletores.andamento),
        encerrada: obterElemento(CONFIG.seletores.encerrada),

        crescente: obterElemento(CONFIG.seletores.crescente),
        decrescente: obterElemento(CONFIG.seletores.decrescente),
        prioridade: obterElemento(CONFIG.seletores.prioridade),

        mensagem: obterElemento(CONFIG.seletores.mensagem),
        botaoBuscar: obterElemento(CONFIG.seletores.botaoBuscar),
        container: obterElemento(CONFIG.seletores.container)
    };


    /* =========================================================
       DATA
    ========================================================= */

    const DataUtils = {

        apenasNumeros(valor) {
            return valor.replace(/\D/g, '');
        },

        aplicarMascara(valor) {

            const numeros = this.apenasNumeros(valor)
                .substring(0, 8);

            if (numeros.length <= 2) {
                return numeros;
            }

            if (numeros.length <= 4) {
                return `${numeros.substring(0, 2)}/${numeros.substring(2)}`;
            }

            return `${numeros.substring(0, 2)}/${numeros.substring(2, 4)}/${numeros.substring(4)}`;
        },

        formatoValido(valor) {
            return /^\d{2}\/\d{2}\/\d{4}$/.test(valor);
        },

        dataValida(valor) {

            if (!this.formatoValido(valor)) {
                return false;
            }

            const [dia, mes, ano] = valor.split('/').map(Number);

            const data = new Date(ano, mes - 1, dia);

            return (
                data.getFullYear() === ano &&
                data.getMonth() === mes - 1 &&
                data.getDate() === dia
            );
        }
    };


    /* =========================================================
       MENSAGENS
    ========================================================= */

    const Mensagem = {

        mostrar(texto, tipo = 'erro') {

            if (!elementos.mensagem) {
                return;
            }

            elementos.mensagem.textContent = texto;

            elementos.mensagem.dataset.tipo = tipo;

            elementos.mensagem.hidden = false;
        },

        erro(texto) {
            this.mostrar(texto, 'erro');
        },

        sucesso(texto) {
            this.mostrar(texto, 'sucesso');
        },

        limpar() {

            if (!elementos.mensagem) {
                return;
            }

            elementos.mensagem.textContent = '';
            elementos.mensagem.hidden = true;
            delete elementos.mensagem.dataset.tipo;
        }
    };


    /* =========================================================
       VALIDAÇÃO
    ========================================================= */

    const Validacao = {

        campoObrigatorio(elemento, mensagem) {

            if (!elemento) {
                return true;
            }

            const valor = elemento.value.trim();

            if (!valor) {
                this.focar(elemento);
                Mensagem.erro(mensagem);

                return false;
            }

            return true;
        },

        data() {

            if (!elementos.data) {
                return true;
            }

            const valor = elementos.data.value.trim();

            /*
             * A data pode permanecer vazia.
             * O sistema original utiliza a data como filtro opcional.
             */
            if (!valor) {
                return true;
            }

            if (!DataUtils.dataValida(valor)) {

                this.focar(elementos.data);

                Mensagem.erro('Informe uma data válida.');

                return false;
            }

            return true;
        },

        numero() {

            if (!elementos.numero) {
                return true;
            }

            const valor = elementos.numero.value.trim();

            if (!valor) {
                this.focar(elementos.numero);

                Mensagem.erro('Informe o número da licitação.');

                return false;
            }

            return true;
        },

        ano() {

            if (!elementos.ano) {
                return true;
            }

            const valor = elementos.ano.value.trim();

            if (!valor) {
                this.focar(elementos.ano);

                Mensagem.erro('Informe o ano da licitação.');

                return false;
            }

            return true;
        },

        formulario() {

            Mensagem.limpar();

            if (!this.numero()) {
                return false;
            }

            if (!this.ano()) {
                return false;
            }

            if (!this.data()) {
                return false;
            }

            return true;
        },

        focar(elemento) {

            elemento.focus();

            elemento.classList.add('campo-invalido');

            setTimeout(() => {
                elemento.classList.remove('campo-invalido');
            }, 1500);
        }
    };


    /* =========================================================
       MÁSCARA DA DATA
    ========================================================= */

    const DataMask = {

        inicializar() {

            if (!elementos.data) {
                return;
            }

            elementos.data.addEventListener('input', (evento) => {

                const valorAtual = evento.target.value;

                evento.target.value =
                    DataUtils.aplicarMascara(valorAtual);

            });

            elementos.data.addEventListener('blur', () => {

                const valor = elementos.data.value.trim();

                if (!valor) {
                    return;
                }

                if (!DataUtils.dataValida(valor)) {

                    elementos.data.classList.add('campo-invalido');

                    Mensagem.erro('Informe uma data válida.');

                    return;
                }

                elementos.data.classList.remove('campo-invalido');
            });
        }
    };


    /* =========================================================
       RADIO BUTTONS
    ========================================================= */

    const Radios = {

        inicializar() {

            this.configurarGrupo([
                elementos.aviso,
                elementos.andamento,
                elementos.encerrada
            ]);

            this.configurarGrupo([
                elementos.crescente,
                elementos.decrescente,
                elementos.prioridade
            ]);
        },

        configurarGrupo(grupo) {

            grupo
                .filter(elementoExiste)
                .forEach((elemento) => {

                    elemento.addEventListener('change', () => {

                        grupo
                            .filter(elementoExiste)
                            .forEach((outro) => {

                                outro.parentElement
                                    ?.classList
                                    .remove('radio-selecionado');

                            });

                        if (elemento.checked) {

                            elemento.parentElement
                                ?.classList
                                .add('radio-selecionado');

                        }
                    });

                });
        }
    };


    /* =========================================================
       CAMPOS
    ========================================================= */

    const Campos = {

        inicializar() {

            this.adicionarLimiteNumerico(elementos.numero, 4);
            this.adicionarLimiteNumerico(elementos.ano, 4);

            this.configurarUpperCase(elementos.municipio);
        },

        adicionarLimiteNumerico(elemento, limite) {

            if (!elemento) {
                return;
            }

            elemento.addEventListener('input', () => {

                elemento.value = elemento.value
                    .replace(/\D/g, '')
                    .substring(0, limite);

            });
        },

        configurarUpperCase(elemento) {

            if (!elemento) {
                return;
            }

            elemento.addEventListener('blur', () => {
                elemento.value = elemento.value.trim();
            });
        }
    };


    /* =========================================================
       FORMULÁRIO
    ========================================================= */

    const Formulario = {

        inicializar() {

            if (!elementos.formulario) {
                return;
            }

            elementos.formulario.addEventListener(
                'submit',
                (evento) => this.enviar(evento)
            );
        },

        enviar(evento) {

            /*
             * O Web Forms possui seu próprio mecanismo de validação.
             * Não devemos bloquear o postback se a infraestrutura
             * ASP.NET estiver presente.
             */

            if (typeof window.ValidatorOnSubmit === 'function') {

                const resultado = window.ValidatorOnSubmit();

                if (resultado === false) {
                    evento.preventDefault();
                    return;
                }
            }

            if (!Validacao.formulario()) {
                evento.preventDefault();
                return;
            }

            this.estadoCarregando();
        },

        estadoCarregando() {

            if (!elementos.botaoBuscar) {
                return;
            }

            elementos.botaoBuscar.classList.add('carregando');

            elementos.botaoBuscar.setAttribute(
                'aria-busy',
                'true'
            );
        }
    };


    /* =========================================================
       IFRAME / ALTURA
    ========================================================= */

    const Iframe = {

        inicializar() {

            if (window.self === window.top) {
                return;
            }

            this.enviarAltura();

            window.addEventListener(
                'resize',
                () => this.enviarAltura()
            );

            this.observarAlteracoes();
        },

        obterAltura() {

            if (!elementos.container) {
                return document.documentElement.scrollHeight;
            }

            return elementos.container.clientHeight +
                CONFIG.iframe.margem;
        },

        enviarAltura() {

            const altura = this.obterAltura();

            window.parent.postMessage(
                {
                    type: 'cdhu-resize',
                    height: altura
                },
                '*'
            );
        },

        observarAlteracoes() {

            if (!elementos.container) {
                return;
            }

            const observer = new MutationObserver(() => {
                this.enviarAltura();
            });

            observer.observe(
                elementos.container,
                {
                    attributes: true,
                    childList: true,
                    characterData: true,
                    subtree: true
                }
            );
        }
    };


    /* =========================================================
       ACESSIBILIDADE
    ========================================================= */

    const Acessibilidade = {

        inicializar() {

            if (elementos.data) {
                elementos.data.setAttribute(
                    'inputmode',
                    'numeric'
                );

                elementos.data.setAttribute(
                    'autocomplete',
                    'off'
                );

                elementos.data.setAttribute(
                    'aria-label',
                    'Data de abertura do envelope'
                );
            }

            if (elementos.mensagem) {
                elementos.mensagem.setAttribute(
                    'role',
                    'alert'
                );
            }
        }
    };


    /* =========================================================
       APLICAÇÃO
    ========================================================= */

    const App = {

        inicializar() {

            DataMask.inicializar();
            Radios.inicializar();
            Campos.inicializar();
            Formulario.inicializar();
            Iframe.inicializar();
            Acessibilidade.inicializar();

            console.info(
                'Busca de Licitação inicializada.'
            );
        }
    };


    /* =========================================================
       INICIALIZAÇÃO
    ========================================================= */

    if (document.readyState === 'loading') {

        document.addEventListener(
            'DOMContentLoaded',
            () => App.inicializar()
        );

    } else {

        App.inicializar();
    }


    /* =========================================================
       API OPCIONAL
       Permite depuração pelo console.
    ========================================================= */

    window.BuscaLicitacao = {
        validar: () => Validacao.formulario(),
        enviarAltura: () => Iframe.enviarAltura(),
        formatarData: (valor) => DataUtils.aplicarMascara(valor),
        dataValida: (valor) => DataUtils.dataValida(valor)
    };

})();