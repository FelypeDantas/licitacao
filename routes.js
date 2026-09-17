import { Router } from "express";
import { buscarNoCdhu } from "./cdhu.js";
import { validarFiltros } from "./validators.js";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    servico: "backend-licitacao-cdhu",
    timestamp: new Date().toISOString()
  });
});

router.post("/api/licitacoes", async (req, res, next) => {
  try {
    const filtros = validarFiltros(req.body);
    const resultado = await buscarNoCdhu(filtros);

    res.json({
      ok: true,
      ...resultado
    });
  } catch (error) {
    next(error);
  }
});
