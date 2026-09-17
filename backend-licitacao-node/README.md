# Backend Node.js - Busca Licitação CDHU

Backend para o frontend hospedado no GitHub Pages.

## 1. Requisitos

- Node.js 20+
- npm

## 2. Instalação

```bash
npm install
```

Copie `.env.example` para `.env`:

```bash
copy .env.example .env
```

No Linux/macOS:

```bash
cp .env.example .env
```

## 3. Executar

Desenvolvimento:

```bash
npm run dev
```

Produção:

```bash
npm start
```

A API ficará em:

```text
http://localhost:3000
```

Teste:

```text
GET http://localhost:3000/health
```

## 4. Endpoint

```text
POST /api/licitacoes
Content-Type: application/json
```

Exemplo:

```json
{
  "modalidade": "",
  "numero": "048",
  "ano": "24",
  "municipio": "",
  "segmento": "",
  "data": "",
  "situacao": "",
  "ordenacao": ""
}
```

Resposta:

```json
{
  "ok": true,
  "resultados": [],
  "mensagem": null,
  "quantidade": 0,
  "fonte": "https://app.cdhu.sp.gov.br/Licitacoes/busca_internet.aspx"
}
```

## 5. Frontend

No JS do GitHub Pages, troque:

```js
fetch("/api/licitacoes", ...)
```

por:

```js
fetch("https://SEU-BACKEND/api/licitacoes", ...)
```

porque GitHub Pages e o backend estarão em domínios diferentes.

Exemplo:

```js
const API_URL = "https://seu-backend.exemplo.com/api/licitacoes";

const resposta = await fetch(API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(filtros)
});
```

Depois, no `.env` do backend:

```env
FRONTEND_ORIGIN=https://felypedantas.github.io
```

## 6. Como o backend funciona

1. Faz GET na página pública de Busca Licitação da CDHU.
2. Captura os campos ocultos do ASP.NET Web Forms, incluindo `__VIEWSTATE` e `__EVENTVALIDATION`.
3. Mantém os cookies da sessão.
4. Monta o POST com os nomes reais do formulário.
5. Simula o clique do botão de imagem usando `buscarImageButton.x` e `buscarImageButton.y`.
6. Recebe o HTML da CDHU.
7. Procura tabelas de resultados.
8. Converte as linhas para JSON.
9. Entrega o JSON para o frontend.

## 7. Observação importante sobre o parser

A página da CDHU é um sistema ASP.NET Web Forms e o HTML pode mudar. O código tenta localizar os resultados de forma genérica para não depender de uma única classe CSS.

Se a CDHU alterar a estrutura da tabela, ajuste `parseTables()` em `src/cdhu.js`.

Para depurar a resposta da CDHU:

```env
DEBUG_HTML=true
```

Isso imprime o começo do HTML recebido no terminal.
