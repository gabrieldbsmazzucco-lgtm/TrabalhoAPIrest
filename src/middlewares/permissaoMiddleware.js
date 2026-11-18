function permissaoMiddleware(...perfisPermitidos) {
  return (req, res, next) => {
    // Verifica se o usuário foi autenticado
    if (!req.usuario) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    // Verifica se o perfil possui permissão
    if (!perfisPermitidos.includes(req.usuario.role)) {
      return res.status(403).json({
        message: "Você não possui permissão para realizar esta operação.",
      });
    }

    // Permite continuar
    next();
  };
}

module.exports = permissaoMiddleware;
