export default function handler(req, res) {
    // Permite verificar a API pelo navegador
    res.setHeader(
        "Access-Control-Allow-Origin",
        process.env.FRONTEND_ORIGIN || "*"
    );

    // Apenas GET
    if (req.method !== "GET") {
        return res.status(405).json({
            sucesso: false,
            erro: "Método não permitido. Utilize GET."
        });
    }

    return res.status(200).json({
        sucesso: true,
        status: "online",
        servico: "API de Licitações",
        timestamp: new Date().toISOString()
    });
}