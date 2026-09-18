'use strict';

/**
 * ============================================================
 * BUSCA DE LICITAÇÕES - CDHU
 * ============================================================
 *
 * Fluxo:
 *
 * 1. Usuário preenche os filtros
 * 2. JavaScript coleta os dados
 * 3. JavaScript envia os dados para a API
 * 4. Backend consulta o sistema da CDHU
 * 5. Backend devolve os resultados em JSON
 * 6. JavaScript apresenta os resultados na tela
 *
 * O JavaScript NÃO acessa diretamente o site da CDHU.
 *
 * ============================================================
 */

(() => {

    /* ============================================================
       CONFIGURAÇÃO
    ============================================================ */

        const CONFIG = {
            api: {
                buscar: 'https://licitacao-murex.vercel.app/api/licitacoes'
            },
        
            campos: {
                formulario: '#form1',
        
                modalidade: '#modalidadeDropDownList',
                numero: '#numTextBox',
                ano: '#anoTextBox',
                municipio: '#municipioTextBox',
                segmento: '#segmentoDropDownList',
                data: '#dataTextBox',
        
                situacao: 'input[name="situacao"]:checked',
                ordenacao: 'input[name="ordenacao"]:checked'
            },
        
            elementos: {
                botaoBuscar: '#buscarImageButton',
                resultados: '#resultados',
                mensagem: '#mensagem',
                carregando: '#carregando'
            }
        };


    /* ============================================================
       UTILITÁRIOS
    ============================================================ */

    const DOM = {

        obter(seletor) {
            return document.querySelector(seletor);
        },

        obterTodos(seletor) {
            return [...document.querySelectorAll(seletor)];
        },

        valor(seletor) {
            const elemento = this.obter(seletor);
            return elemento?.value?.trim() || '';
        }
    };


    /* ============================================================
       ESTADO DA APLICAÇÃO
    ============================================================ */

    const estado = {
        buscando: false,
        resultados: []
    };


    /* ============================================================
       ELEMENTOS
    ============================================================ */

    const elementos = {
        formulario: DOM.obter(CONFIG.campos.formulario),

        modalidade: DOM.obter(CONFIG.campos.modalidade),
        numero: DOM.obter(CONFIG.campos.numero),
        ano: DOM.obter(CONFIG.campos.ano),
        municipio: DOM.obter(CONFIG.campos.municipio),
        segmento: DOM.obter(CONFIG.campos.segmento),
        data: DOM.obter(CONFIG.campos.data),

        botaoBuscar: DOM.obter(CONFIG.elementos.botaoBuscar),
        resultados: DOM.obter(CONFIG.elementos.resultados),
        mensagem: DOM.obter(CONFIG.elementos.mensagem),
        carregando: DOM.obter(CONFIG.elementos.carregando)
    };


    /* ============================================================
       FORMATAÇÃO
    ============================================================ */

    const Formatador = {

        data(valor) {

            if (!valor) {
                return '';
            }

            const numeros = valor
                .replace(/\D/g, '')
                .substring(0, 8);

            if (numeros.length <= 2) {
                return numeros;
            }

            if (numeros.length <= 4) {
                return (
                    numeros.substring(0, 2) +
                    '/' +
                    numeros.substring(2)
                );
            }

            return (
                numeros.substring(0, 2) +
                '/' +
                numeros.substring(2, 4) +
                '/' +
                numeros.substring(4)
            );
        },

        texto(valor) {
            return String(valor ?? '').trim();
        }
    };


    /* ============================================================
       COLETA DOS FILTROS
    ============================================================ */

    const Filtros = {

        obter() {

            const situacao = document.querySelector(
                CONFIG.campos.situacao
            );

            const ordenacao = document.querySelector(
                CONFIG.campos.ordenacao
            );

            return {
                modalidade: elementos.modalidade?.value || '',
                numero: elementos.numero?.value.trim() || '',
                ano: elementos.ano?.value.trim() || '',
                municipio: elementos.municipio?.value.trim() || '',
                segmento: elementos.segmento?.value || '',
                data: elementos.data?.value.trim() || '',

                situacao: situacao?.value || '',
                ordenacao: ordenacao?.value || ''
            };
        }
    };


    /* ============================================================
       VALIDAÇÃO
    ============================================================ */

    const Validacao = {

        executar(filtros) {

            if (!filtros.numero && !filtros.ano) {
                return {
                    valido: false,
                    mensagem: 'Informe o número e o ano da licitação.'
                };
            }

            if (filtros.numero && !/^\d{1,4}$/.test(filtros.numero)) {
                return {
                    valido: false,
                    mensagem: 'O número da licitação deve conter apenas números.'
                };
            }

            if (filtros.ano && !/^\d{2,4}$/.test(filtros.ano)) {
                return {
                    valido: false,
                    mensagem: 'Informe um ano válido.'
                };
            }

            if (
                filtros.data &&
                !/^\d{2}\/\d{2}\/\d{4}$/.test(filtros.data)
            ) {
                return {
                    valido: false,
                    mensagem: 'A data deve estar no formato dd/mm/aaaa.'
                };
            }

            return {
                valido: true,
                mensagem: ''
            };
        }
    };


    /* ============================================================
       MENSAGENS
    ============================================================ */

    const Mensagem = {

        mostrar(texto, tipo = 'info') {

            if (!elementos.mensagem) {
                return;
            }

            elementos.mensagem.textContent = texto;
            elementos.mensagem.className = `mensagem ${tipo}`;
            elementos.mensagem.hidden = false;
        },

        esconder() {

            if (!elementos.mensagem) {
                return;
            }

            elementos.mensagem.hidden = true;
            elementos.mensagem.textContent = '';
        },

        erro(texto) {
            this.mostrar(texto, 'erro');
        },

        sucesso(texto) {
            this.mostrar(texto, 'sucesso');
        }
    };


    /* ============================================================
       ESTADO DE CARREGAMENTO
    ============================================================ */

    const Loading = {

        iniciar() {

            estado.buscando = true;

            elementos.botaoBuscar?.setAttribute(
                'disabled',
                'disabled'
            );

            if (elementos.botaoBuscar) {
                elementos.botaoBuscar.textContent = 'Buscando...';
            }

            elementos.carregando?.removeAttribute('hidden');

            Mensagem.esconder();
        },

        finalizar() {

            estado.buscando = false;

            elementos.botaoBuscar?.removeAttribute(
                'disabled'
            );

            if (elementos.botaoBuscar) {
                elementos.botaoBuscar.textContent = 'Buscar';
            }

            elementos.carregando?.setAttribute(
                'hidden',
                ''
            );
        }
    };


    /* ============================================================
       API
    ============================================================ */

    const API = {

        async buscar(filtros) {

            const resposta = await fetch(
                CONFIG.api.buscar,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },

                    body: JSON.stringify(filtros)
                }
            );

            if (!resposta.ok) {
                throw new Error(
                    `Erro HTTP ${resposta.status}`
                );
            }

            return await resposta.json();
        }
    };


    /* ============================================================
       RESULTADOS
    ============================================================ */

    const Resultados = {

        limpar() {

            if (elementos.resultados) {
                elementos.resultados.innerHTML = '';
            }

            estado.resultados = [];
        },

        renderizar(dados) {

            this.limpar();

            const resultados = Array.isArray(dados)
                ? dados
                : dados.resultados;

            if (!resultados || resultados.length === 0) {

                Mensagem.mostrar(
                    'Nenhuma licitação encontrada.',
                    'info'
                );

                return;
            }

            estado.resultados = resultados;

            resultados.forEach((licitacao) => {
                this.adicionar(licitacao);
            });

            Mensagem.sucesso(
                `${resultados.length} licitação(ões) encontrada(s).`
            );
        },

        adicionar(licitacao) {

            if (!elementos.resultados) {
                return;
            }

            const item = document.createElement('article');

            item.className = 'resultado-licitacao';

            item.innerHTML = `
                <div class="resultado-cabecalho">
                    <strong>
                        ${this.escapar(
                            licitacao.numero || '-'
                        )}
                    </strong>
                </div>

                <div class="resultado-conteudo">

                    <div class="resultado-campo">
                        <span>Modalidade</span>
                        <strong>
                            ${this.escapar(
                                licitacao.modalidade || '-'
                            )}
                        </strong>
                    </div>

                    <div class="resultado-campo">
                        <span>Município</span>
                        <strong>
                            ${this.escapar(
                                licitacao.municipio || '-'
                            )}
                        </strong>
                    </div>

                    <div class="resultado-campo">
                        <span>Situação</span>
                        <strong>
                            ${this.escapar(
                                licitacao.situacao || '-'
                            )}
                        </strong>
                    </div>

                    <div class="resultado-campo">
                        <span>Data de abertura</span>
                        <strong>
                            ${this.escapar(
                                licitacao.dataAbertura || '-'
                            )}
                        </strong>
                    </div>

                </div>
            `;

            elementos.resultados.appendChild(item);
        },

        escapar(valor) {

            return String(valor ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    };


    /* ============================================================
       BUSCA
    ============================================================ */

    const Busca = {

        async executar() {

            if (estado.buscando) {
                return;
            }

            const filtros = Filtros.obter();

            const validacao = Validacao.executar(
                filtros
            );

            if (!validacao.valido) {

                Mensagem.erro(
                    validacao.mensagem
                );

                return;
            }

            Loading.iniciar();

            try {

                const dados = await API.buscar(
                    filtros
                );

                Resultados.renderizar(dados);

            } catch (erro) {

                console.error(
                    'Erro ao buscar licitação:',
                    erro
                );

                Resultados.limpar();

                Mensagem.erro(
                    'Não foi possível realizar a busca. Tente novamente.'
                );

            } finally {

                Loading.finalizar();
            }
        }
    };


    /* ============================================================
       MÁSCARA DA DATA
    ============================================================ */

    const Mascara = {

        inicializar() {

            if (!elementos.data) {
                return;
            }

            elementos.data.addEventListener(
                'input',
                (evento) => {

                    evento.target.value =
                        Formatador.data(
                            evento.target.value
                        );

                }
            );
        }
    };


    /* ============================================================
       EVENTOS
    ============================================================ */

    const Eventos = {

        inicializar() {

            if (elementos.formulario) {

                elementos.formulario.addEventListener(
                    'submit',
                    (evento) => {

                        evento.preventDefault();

                        Busca.executar();
                    }
                );
            }

            if (elementos.botaoBuscar) {

                elementos.botaoBuscar.addEventListener(
                    'click',
                    (evento) => {

                        evento.preventDefault();

                        Busca.executar();
                    }
                );
            }

            this.teclaEnter();
        },

        teclaEnter() {

            document.addEventListener(
                'keydown',
                (evento) => {

                    if (
                        evento.key === 'Enter' &&
                        evento.target.matches(
                            'input'
                        )
                    ) {

                        evento.preventDefault();

                        Busca.executar();
                    }
                }
            );
        }
    };


    /* ============================================================
       INICIALIZAÇÃO
    ============================================================ */

    const App = {

        inicializar() {

            Mascara.inicializar();
            Eventos.inicializar();

            console.info(
                'Sistema de Busca de Licitações iniciado.'
            );
        }
    };


    /* ============================================================
       START
    ============================================================ */

    if (document.readyState === 'loading') {

        document.addEventListener(
            'DOMContentLoaded',
            App.inicializar
        );

    } else {

        App.inicializar();
    }


    /* ============================================================
       API PÚBLICA
       Útil para testes no console.
    ============================================================ */

    window.BuscaLicitacao = {
        buscar: () => Busca.executar(),
        obterFiltros: () => Filtros.obter()
    };

})();
