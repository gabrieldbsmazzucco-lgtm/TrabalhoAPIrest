const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  try {
    // Obtém o token do cabeçalho Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Token de autenticação não informado.",
      });
    }

    // Verifica o formato Bearer do token
    const partes = authHeader.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer") {
      return res.status(401).json({
        message: "Formato do token inválido.",
      });
    }

    const token = partes[1];

    // Verifica se a chave JWT está configurada
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET não configurada no .env");
    }

    // Valida o token
    const dadosUsuario = jwt.verify(token, process.env.JWT_SECRET);

    // Disponibiliza os dados do usuário para as próximas etapas
    req.usuario = {
      id: dadosUsuario.id,
      role: dadosUsuario.role,
    };

    // Permite continuar a requisição
    next();
  } catch (erro) {
    if (
      erro.name === "JsonWebTokenError" ||
      erro.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Token inválido ou expirado.",
      });
    }

    console.error("Erro na autenticação:", erro.message);

    return res.status(500).json({
      message: "Erro ao verificar autenticação.",
    });
  }
}

module.exports = authMiddleware;
