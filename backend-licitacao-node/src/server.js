import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { router } from "./routes.js";

const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      // Permite ferramentas locais (Postman, curl, desenvolvimento local)
      // e o domínio configurado do frontend.
      if (!origin) return callback(null, true);

      const allowed = origin === config.frontendOrigin;

      callback(
        allowed ? null : new Error("Origem não autorizada pelo CORS."),
        allowed
      );
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json({ limit: "100kb" }));

app.use(router);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    erro: "Rota não encontrada.",
    codigo: "NOT_FOUND"
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);

  const status = Number(error.status) || 500;

  res.status(status).json({
    ok: false,
    erro: error.message || "Erro interno.",
    codigo: error.code || "INTERNAL_ERROR",
    ...(error.details ? { detalhes: error.details } : {})
  });
});

app.listen(config.port, () => {
  console.log(`Backend rodando em http://localhost:${config.port}`);
  console.log(`CDHU: ${config.cdhuUrl}`);
  console.log(`Frontend permitido: ${config.frontendOrigin}`);
});
